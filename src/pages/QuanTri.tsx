import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { laQuanTriHeThong } from '../lib/quanTri'
import DanhSachLop from './qt/DanhSachLop'
import TaoLop from './qt/TaoLop'
import MotLop from './qt/MotLop'
import '../styles/quantri.css'

/* ---------------- Đăng nhập ---------------- */
function DangNhap() {
  const [email, setEmail] = useState('')
  const [maOtp, setMaOtp] = useState('')
  const [daGui, setDaGui] = useState(false)
  const [loi, setLoi] = useState('')
  const [dangGui, setDangGui] = useState(false)

  const gui = async (e: FormEvent) => {
    e.preventDefault()
    setLoi(''); setDangGui(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/quan-tri`, shouldCreateUser: true },
    })
    setDangGui(false)
    if (error) setLoi(error.message)
    else setDaGui(true)
  }

  const xacNhanMa = async (e: FormEvent) => {
    e.preventDefault()
    setLoi('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: maOtp.trim(), type: 'email' })
    if (error) setLoi('Mã không đúng hoặc đã hết hạn.')
  }

  return (
    <main className="qt-khung qt-hep">
      <h1>Đăng nhập quản trị</h1>
      {!daGui ? (
        <form onSubmit={gui} className="qt-form">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <button className="qt-nut chinh" disabled={dangGui}>{dangGui ? 'Đang gửi…' : 'Gửi link đăng nhập'}</button>
        </form>
      ) : (
        <div className="qt-form">
          <p>Đã gửi email tới <b>{email}</b>. Mở email và bấm vào link đăng nhập (trên cùng thiết bị này).</p>
          <form onSubmit={xacNhanMa} className="qt-form">
            <label htmlFor="otp">Hoặc nhập mã trong email (nếu có)</label>
            <input id="otp" inputMode="numeric" value={maOtp} onChange={(e) => setMaOtp(e.target.value)} />
            <button className="qt-nut">Xác nhận mã</button>
          </form>
          <button className="qt-link" onClick={() => setDaGui(false)}>Gửi lại / đổi email</button>
        </div>
      )}
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </main>
  )
}

/* ---------------- Khung quản trị ---------------- */
export default function QuanTri() {
  const [phien, setPhien] = useState<Session | null | undefined>(undefined)
  const [laAdmin, setLaAdmin] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setPhien(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setPhien(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (phien) laQuanTriHeThong().then(setLaAdmin)
    else setLaAdmin(undefined)
  }, [phien])

  useEffect(() => {
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'
    document.head.appendChild(m); document.title = 'Quản trị · thanhxuan.vn'
    return () => m.remove()
  }, [])

  return (
    <div className="qt">
      <header className="qt-dau">
        <div className="qt-khung qt-dau-trong">
          <Link to="/quan-tri" className="qt-logo">thanh xuân <b>quản trị</b></Link>
          {phien && laAdmin && (
            <nav className="qt-nav" aria-label="Quản trị chung">
              <NavLink to="/quan-tri" end>Các lớp</NavLink>
              <NavLink to="/quan-tri/tao-lop">Tạo lớp</NavLink>
            </nav>
          )}
          {phien && (
            <span className="qt-hang qt-tai-khoan">
              <small title={phien.user.email}>{phien.user.email}</small>
              <button className="qt-nut nho" onClick={() => supabase.auth.signOut()}>Đăng xuất</button>
            </span>
          )}
        </div>
      </header>

      {phien === undefined ? <main className="qt-khung">Đang tải…</main>
        : !phien ? <DangNhap />
        : laAdmin === undefined ? <main className="qt-khung">Đang kiểm tra quyền…</main>
        : !laAdmin ? (
          <main className="qt-khung qt-hep">
            <h1>Trang này dành cho người dựng trang</h1>
            <p>Tài khoản <b>{phien.user.email}</b> chưa có quyền quản trị hệ thống.</p>
            <p>Nếu bạn là lớp trưởng, hãy vào <Link to="/lop-truong">trang lớp trưởng</Link> và đăng nhập bằng số điện thoại + mã PIN. Các bạn trong lớp chỉ cần link hoặc mã QR của lớp, không cần đăng nhập.</p>
            <button className="qt-nut" onClick={() => supabase.auth.signOut()}>Đăng xuất</button>
          </main>
        ) : (
          <Routes>
            <Route index element={<DanhSachLop />} />
            <Route path="tao-lop" element={<TaoLop />} />
            <Route path="lop/:id/*" element={<MotLop />} />
          </Routes>
        )}
    </div>
  )
}
