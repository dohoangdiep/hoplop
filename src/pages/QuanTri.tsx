import { useEffect, useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import {
  laQuanTriHeThong, danhSachLop, layLop, taoLop, datMatKhau, taoMatKhauLop, capNhatLop,
  type LopQuanTri,
} from '../lib/quanTri'
import { DANH_SACH_GIAO_DIEN, GIAO_DIEN, type MaGiaoDien } from '../themes'
import { QuanLyThanhVien, SuaSoDo, QuanLyAnh, NutNapDemo, BAT_DEMO } from './QuanTriLop'
import type { ThanhVienQT } from '../lib/quanTri'
import '../styles/quantri.css'

const TRANG_THAI: Record<string, string> = {
  'thu-tu-lieu': 'Đang thu tư liệu',
  'dang-dung': 'Đang dựng',
  'da-ban-giao': 'Đã bàn giao',
  'chi-xem': 'Chỉ xem (hết hạn)',
  'luu-tru': 'Lưu trữ',
}

const linkLop = (ma: string) => `${window.location.origin}/${ma}`

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

/* ---------------- Mã QR ---------------- */
function MaQR({ url, tenFile }: { url: string; tenFile: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => { QRCode.toDataURL(url, { width: 600, margin: 2 }).then(setSrc) }, [url])
  if (!src) return null
  return (
    <div className="qt-qr">
      <img src={src} alt={`Mã QR mở ${url}`} width={200} height={200} />
      <a className="qt-nut" href={src} download={tenFile}>Tải mã QR</a>
    </div>
  )
}

function SaoChep({ text, nhan }: { text: string; nhan: string }) {
  const [xong, setXong] = useState(false)
  return (
    <button type="button" className="qt-nut nho" onClick={() => { navigator.clipboard.writeText(text); setXong(true); setTimeout(() => setXong(false), 1500) }}>
      {xong ? 'Đã chép' : nhan}
    </button>
  )
}

/* ---------------- Danh sách lớp ---------------- */
function DanhSach() {
  const [ds, setDs] = useState<LopQuanTri[] | null>(null)
  const [loi, setLoi] = useState('')
  useEffect(() => { danhSachLop().then(setDs).catch((e) => setLoi(e.message)) }, [])
  return (
    <main className="qt-khung">
      <div className="qt-tieu-de">
        <h1>Các lớp</h1>
        <Link className="qt-nut chinh" to="/quan-tri/tao-lop">Tạo lớp mới</Link>
      </div>
      {loi && <p className="qt-loi">{loi}</p>}
      {ds === null ? <p>Đang tải…</p> : ds.length === 0 ? (
        <p className="qt-mo">Chưa có lớp nào. Bấm “Tạo lớp mới” để bắt đầu.</p>
      ) : (
        <ul className="qt-ds">
          {ds.map((l) => (
            <li key={l.id}>
              <Link to={`/quan-tri/lop/${l.id}`}>
                <strong>Lớp {l.ten_lop} · {l.truong}</strong>
                <span>{l.nien_khoa_bat_dau}–{l.nien_khoa_ket_thuc} · mã <code>{l.ma}</code> · {TRANG_THAI[l.trang_thai] ?? l.trang_thai}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {BAT_DEMO && ds && ds.length > 0 && (
        <section className="qt-muc">
          <h2>Dữ liệu demo</h2>
          <p className="qt-mo" style={{ fontSize: 13, margin: 0 }}>Vẽ ảnh hoạt hình minh họa (ảnh xưa, chân dung từng bạn, buổi họp lớp) rồi tải lên và duyệt sẵn cho tất cả lớp.</p>
          <NutNapDemo lops={ds} nhan={`Nạp ảnh demo cho cả ${ds.length} lớp`} />
        </section>
      )}
    </main>
  )
}

/* ---------------- Tạo lớp ---------------- */
function ChonGiaoDien({ value, onChange }: { value: MaGiaoDien; onChange: (v: MaGiaoDien) => void }) {
  return (
    <fieldset className="qt-chon-gd">
      <legend>Mẫu giao diện</legend>
      {DANH_SACH_GIAO_DIEN.map((k) => (
        <label key={k} className={value === k ? 'chon' : ''}>
          <input type="radio" name="giao-dien" value={k} checked={value === k} onChange={() => onChange(k)} />
          <span className="mau" style={{ background: GIAO_DIEN[k].mau.primary }} aria-hidden="true" />
          <span><b>{GIAO_DIEN[k].ten}</b><small>{GIAO_DIEN[k].moTa}</small></span>
        </label>
      ))}
    </fieldset>
  )
}

function TaoLop() {
  const dieuHuong = useNavigate()
  const [tenLop, setTenLop] = useState('')
  const [truong, setTruong] = useState('')
  const [tinh, setTinh] = useState('')
  const [bd, setBd] = useState('')
  const [kt, setKt] = useState('')
  const [gd, setGd] = useState<MaGiaoDien>('hoai-niem')
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState('')
  const [ketQua, setKetQua] = useState<{ lop: LopQuanTri; matKhau: string } | null>(null)

  const gui = async (e: FormEvent) => {
    e.preventDefault()
    setLoi(''); setDang(true)
    try {
      setKetQua(await taoLop({
        tenLop, truong, tinh, giaoDien: gd,
        nienKhoaBatDau: bd ? Number(bd) : null,
        nienKhoaKetThuc: kt ? Number(kt) : null,
      }))
    } catch (e) {
      setLoi((e as Error).message)
    } finally { setDang(false) }
  }

  if (ketQua) {
    const url = linkLop(ketQua.lop.ma)
    const tinNhan = `Trang kỷ niệm lớp ${ketQua.lop.ten_lop} · ${ketQua.lop.truong}\nLink: ${url}\nMật khẩu lớp: ${ketQua.matKhau}`
    return (
      <main className="qt-khung qt-hep">
        <h1>Đã tạo lớp {ketQua.lop.ten_lop}</h1>
        <dl className="qt-tt">
          <dt>Mã lớp</dt><dd><code>{ketQua.lop.ma}</code></dd>
          <dt>Link</dt><dd><a href={url}>{url}</a></dd>
          <dt>Mật khẩu lớp</dt><dd><code>{ketQua.matKhau}</code></dd>
        </dl>
        <p className="qt-mo">Ghi lại mật khẩu ngay: vì lý do bảo mật, hệ thống chỉ lưu dạng mã hóa, không xem lại được (chỉ đặt lại được).</p>
        <div className="qt-hang">
          <SaoChep text={tinNhan} nhan="Chép tin nhắn gửi ban liên lạc" />
          <button className="qt-nut" onClick={() => dieuHuong(`/quan-tri/lop/${ketQua.lop.id}`)}>Mở trang quản lý lớp</button>
        </div>
        <MaQR url={url} tenFile={`qr-lop-${ketQua.lop.ma}.png`} />
      </main>
    )
  }

  return (
    <main className="qt-khung qt-hep">
      <Link to="/quan-tri" className="qt-link">← Các lớp</Link>
      <h1>Tạo lớp mới</h1>
      <form onSubmit={gui} className="qt-form">
        <label htmlFor="ten-lop">Tên lớp</label>
        <input id="ten-lop" required placeholder="12A1" value={tenLop} onChange={(e) => setTenLop(e.target.value)} />
        <label htmlFor="truong">Trường</label>
        <input id="truong" required placeholder="THPT Thanh Miện 2" value={truong} onChange={(e) => setTruong(e.target.value)} />
        <label htmlFor="tinh">Tỉnh / thành</label>
        <input id="tinh" placeholder="Hải Dương" value={tinh} onChange={(e) => setTinh(e.target.value)} />
        <div className="qt-hai-cot">
          <div><label htmlFor="bd">Năm vào trường</label><input id="bd" inputMode="numeric" placeholder="2003" value={bd} onChange={(e) => setBd(e.target.value.replace(/\D/g, ''))} /></div>
          <div><label htmlFor="kt">Năm ra trường</label><input id="kt" inputMode="numeric" placeholder="2006" value={kt} onChange={(e) => setKt(e.target.value.replace(/\D/g, ''))} /></div>
        </div>
        <ChonGiaoDien value={gd} onChange={setGd} />
        <button className="qt-nut chinh" disabled={dang}>{dang ? 'Đang tạo…' : 'Tạo lớp'}</button>
      </form>
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </main>
  )
}

/* ---------------- Chi tiết lớp ---------------- */
function ChiTietLop() {
  const { id = '' } = useParams()
  const [lop, setLop] = useState<LopQuanTri | null | undefined>(undefined)
  const [matKhauMoi, setMatKhauMoi] = useState('')
  const [thongBao, setThongBao] = useState('')
  const [thanhVien, setThanhVien] = useState<ThanhVienQT[]>([])
  useEffect(() => { layLop(id).then(setLop).catch(() => setLop(null)) }, [id])

  if (lop === undefined) return <main className="qt-khung">Đang tải…</main>
  if (lop === null) return <main className="qt-khung">Không tìm thấy lớp hoặc bạn không có quyền.</main>
  const url = linkLop(lop.ma)

  const doiGiaoDien = async (gd: MaGiaoDien) => {
    await capNhatLop(lop.id, { giao_dien: gd }); setLop({ ...lop, giao_dien: gd }); setThongBao('Đã đổi giao diện.')
  }
  const doiTrangThai = async (tt: string) => {
    await capNhatLop(lop.id, { trang_thai: tt }); setLop({ ...lop, trang_thai: tt }); setThongBao('Đã cập nhật trạng thái.')
  }
  const datLaiMatKhau = async () => {
    const mk = taoMatKhauLop()
    await datMatKhau(lop.id, mk); setMatKhauMoi(mk)
  }

  return (
    <main className="qt-khung qt-hep">
      <Link to="/quan-tri" className="qt-link">← Các lớp</Link>
      <h1>Lớp {lop.ten_lop} · {lop.truong}</h1>
      <dl className="qt-tt">
        <dt>Mã lớp</dt><dd><code>{lop.ma}</code></dd>
        <dt>Link</dt><dd><a href={url} target="_blank" rel="noreferrer">{url}</a></dd>
        <dt>Niên khóa</dt><dd>{lop.nien_khoa_bat_dau}–{lop.nien_khoa_ket_thuc}</dd>
      </dl>

      <label htmlFor="trang-thai" className="qt-nhan">Trạng thái</label>
      <select id="trang-thai" value={lop.trang_thai} onChange={(e) => doiTrangThai(e.target.value)}>
        {Object.entries(TRANG_THAI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      <ChonGiaoDien value={lop.giao_dien} onChange={doiGiaoDien} />

      <section className="qt-muc">
        <h2>Mật khẩu lớp</h2>
        {matKhauMoi ? (
          <p>Mật khẩu mới: <code>{matKhauMoi}</code> <SaoChep text={matKhauMoi} nhan="Chép" /></p>
        ) : (
          <button className="qt-nut" onClick={datLaiMatKhau}>Đặt lại mật khẩu lớp</button>
        )}
      </section>

      <section className="qt-muc">
        <h2>Mã QR vào trang lớp</h2>
        <MaQR url={url} tenFile={`qr-lop-${lop.ma}.png`} />
      </section>

      <QuanLyThanhVien lopId={lop.id} onDoi={setThanhVien} />
      <SuaSoDo lopId={lop.id} thanhVien={thanhVien} />
      <QuanLyAnh lopId={lop.id} maLop={lop.ma} thanhVien={thanhVien} />

      {BAT_DEMO && (
        <section className="qt-muc">
          <h2>Dữ liệu demo</h2>
          <NutNapDemo lops={[lop]} nhan="Nạp ảnh demo cho lớp này" />
        </section>
      )}

      <section className="qt-muc qt-mo">
        <h2>Sắp có</h2>
        <p>Tạo chương họp lớp và mã QR gửi ảnh tại buổi họp.</p>
      </section>
      {thongBao && <p className="qt-ok" role="status">{thongBao}</p>}
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
          {phien && (
            <span className="qt-hang">
              <small>{phien.user.email}</small>
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
            <h1>Tài khoản chưa có quyền quản trị</h1>
            <p>Đây là lần đăng nhập đầu tiên của <b>{phien.user.email}</b>. Để cấp quyền quản trị hệ thống, chủ dịch vụ chạy câu lệnh sau trong Supabase → SQL Editor, rồi tải lại trang này:</p>
            <pre className="qt-code">{`insert into public.quan_tri_he_thong (user_id)\nvalues ('${phien.user.id}');`}</pre>
            <SaoChep text={`insert into public.quan_tri_he_thong (user_id) values ('${phien.user.id}');`} nhan="Chép câu lệnh" />
          </main>
        ) : (
          <Routes>
            <Route index element={<DanhSach />} />
            <Route path="tao-lop" element={<TaoLop />} />
            <Route path="lop/:id" element={<ChiTietLop />} />
          </Routes>
        )}
    </div>
  )
}
