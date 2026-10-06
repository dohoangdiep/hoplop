import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { moLop, napNoiDungThem, type KetQuaMoLop } from '../lib/lop'
import type { TaiHien as TaiHienT, ThayCo } from '../lib/types'
import { TaiHien, GocThayCo } from '../components/KhoiThem'
import { bienCss, layGiaoDien, napFont, DANH_SACH_GIAO_DIEN, GIAO_DIEN, type MaGiaoDien } from '../themes'
import { Bia, SapHopLop, SoDoChoNgoi, KhoAnhXua, DongThoiGian, NamNayNamNgoai } from '../components/KhoiTrangLop'
import { MA_LOP_MAU, TAI_HIEN_MAU, THAY_CO_MAU } from '../data/lopMau'
import { HopThu } from '../components/HopThu'
import { supabase } from '../lib/supabase'
import '../styles/lop.css'

function useNoIndex() {
  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex, nofollow'
    document.head.appendChild(m)
    return () => m.remove()
  }, [])
}

function NhapMatKhau({ onGui, saiRoi, dangMo }: { onGui: (mk: string) => void; saiRoi: boolean; dangMo: boolean }) {
  const [mk, setMk] = useState('')
  const gui = (e: FormEvent) => { e.preventDefault(); if (mk.trim()) onGui(mk.trim()) }
  return (
    <section className="muc">
      <form className="the" onSubmit={gui} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="tieu-de" style={{ fontSize: 22 }}>Trang riêng của lớp</h2>
        <p className="chu-mo" style={{ fontSize: 15, margin: 0 }}>Nhập mật khẩu lớp (ban liên lạc gửi trong nhóm Zalo) để vào xem. Máy này sẽ nhớ cho lần sau. Có link hoặc mã QR của lớp thì không cần mật khẩu.</p>
        <label htmlFor="mk-lop" style={{ fontWeight: 600, fontSize: 14 }}>Mật khẩu lớp</label>
        <input
          id="mk-lop" value={mk} onChange={(e) => setMk(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off"
          style={{ minHeight: 48, borderRadius: 'var(--bo-sm)', border: '1px solid var(--mau-line)', padding: '0 14px', fontSize: 16, fontFamily: 'inherit', background: 'var(--mau-card)', color: 'var(--mau-ink)' }}
        />
        {saiRoi && <span role="alert" style={{ color: 'var(--mau-accent)', fontSize: 14 }}>Mật khẩu chưa đúng, bạn thử lại nhé.</span>}
        <button className="nut chinh" disabled={dangMo}>{dangMo ? 'Đang mở…' : 'Vào trang lớp'}</button>
      </form>
    </section>
  )
}

export default function TrangLop() {
  const { ma = '' } = useParams()
  const [tim] = useSearchParams()
  const [kq, setKq] = useState<KetQuaMoLop | undefined>(undefined)
  const [dangMo, setDangMo] = useState(false)
  const dieuHuong = useNavigate()
  const [them, setThem] = useState<{ taiHien: TaiHienT[]; thayCo: ThayCo[] }>({ taiHien: [], thayCo: [] })
  useNoIndex()

  useEffect(() => {
    let huy = false
    setKq(undefined)
    moLop(ma).then(async (r) => {
      if (huy) return
      // Link dùng tên gọi cũ của lớp: chuyển sang tên gọi mới
      if (r.trangThai === 'khong-tim-thay') {
        const { data } = await supabase.rpc('dia_chi_moi', { p_khoa: ma })
        if (!huy && typeof data === 'string' && data && data !== ma.toLowerCase()) { dieuHuong(`/${data}`, { replace: true }); return }
      }
      if (!huy) setKq(r)
    })
    return () => { huy = true }
  }, [ma, dieuHuong])

  const thuMatKhau = async (mk: string) => {
    setDangMo(true)
    setKq(await moLop(ma, mk))
    setDangMo(false)
  }

  // Tái hiện, Góc thầy cô: nạp sau khi đã vào được lớp
  const daVao = kq?.trangThai === 'ok'
  useEffect(() => {
    if (!daVao) return
    if (ma.toLowerCase() === MA_LOP_MAU) { setThem({ taiHien: TAI_HIEN_MAU, thayCo: THAY_CO_MAU }); return }
    let huy = false
    napNoiDungThem(ma).then((r) => { if (!huy) setThem(r) })
    return () => { huy = true }
  }, [daVao, ma])

  const lop = kq?.trangThai === 'ok' ? kq.lop : kq?.trangThai === 'can-mat-khau' ? kq.xemTruoc : null
  const laLopMau = lop?.ma === MA_LOP_MAU
  // Lớp mẫu cho phép xem thử mẫu giao diện khác qua ?giao-dien=...
  const maGiaoDien = (laLopMau && tim.get('giao-dien')) || lop?.giaoDien || 'hoai-niem'
  const giaoDien = layGiaoDien(maGiaoDien)
  const vars = useMemo(() => bienCss(giaoDien), [giaoDien])

  useEffect(() => { napFont(maGiaoDien, giaoDien) }, [maGiaoDien, giaoDien])
  useEffect(() => { if (lop) document.title = `Lớp ${lop.tenLop} · ${lop.truong}` }, [lop])

  if (kq === undefined) return <div className="trang-lop" style={{ ...vars, padding: 40 }}>Đang mở trang lớp…</div>

  if (kq.trangThai === 'khong-tim-thay' || kq.trangThai === 'tam-khoa' || !lop)
    return (
      <div className="trang-lop" style={{ ...vars, padding: '60px 24px', textAlign: 'center' }}>
        <h1 className="tieu-de">{kq.trangThai === 'tam-khoa' ? 'Tạm khóa trong ít phút' : `Không tìm thấy lớp “${ma}”`}</h1>
        <p className="chu-mo" style={{ fontSize: 15 }}>
          {kq.trangThai === 'tam-khoa'
            ? 'Có nhiều lần nhập sai mật khẩu. Bạn đợi khoảng 10 phút rồi thử lại nhé.'
            : 'Bạn kiểm tra lại mã lớp trên thư mời hoặc quét lại mã QR nhé.'}
        </p>
        <Link to="/" style={{ color: 'var(--mau-primary)' }}>Về trang chủ</Link>
      </div>
    )

  const daMo = kq.trangThai === 'ok'
  const chuaCoNoiDung = daMo && !laLopMau && lop.thanhVien.length === 0

  return (
    <div className="trang-lop" style={vars as React.CSSProperties}>
      {laLopMau && (
        <nav className="chon-mau" aria-label="Xem thử mẫu giao diện">
          <span style={{ alignSelf: 'center', color: 'var(--mau-muted)' }}>Lớp mẫu · Xem thử giao diện:</span>
          {DANH_SACH_GIAO_DIEN.map((k: MaGiaoDien) => (
            <Link key={k} to={`/${MA_LOP_MAU}?giao-dien=${k}`} aria-current={k === maGiaoDien ? 'page' : undefined}>
              {GIAO_DIEN[k].ten}
            </Link>
          ))}
        </nav>
      )}
      {daMo && (lop.vai === 'lop-truong' || lop.vai === 'quan-tri') && (
        <nav className="thanh-lop-truong" aria-label="Lối tắt lớp trưởng">
          <span>
            {lop.vai === 'lop-truong' ? 'Bạn là lớp trưởng' : 'Bạn đang xem với quyền quản trị'}
            {lop.soChoDuyet ? ` · ${lop.soChoDuyet} ảnh chờ duyệt` : ''}
          </span>
          {lop.vai === 'lop-truong'
            ? <Link to={`/lop-truong/${lop.ma}`}>{lop.soChoDuyet ? 'Duyệt ảnh' : 'Trang lớp trưởng'}</Link>
            : <Link to={`/quan-tri/lop/${lop.id}`}>Mở quản trị lớp</Link>}
        </nav>
      )}
      <div className="khung">
        <Bia lop={lop} kieu={giaoDien.kieuBia} />
        {!daMo && <NhapMatKhau onGui={thuMatKhau} saiRoi={kq.trangThai === 'can-mat-khau' && kq.daNhapSai} dangMo={dangMo} />}
        {daMo && <SapHopLop lop={lop} />}
        {chuaCoNoiDung && (
          <section className="muc">
            <div className="the" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h2 className="tieu-de" style={{ fontSize: 22 }}>Trang lớp đang được dựng</h2>
              <p className="chu-mo" style={{ fontSize: 15, margin: 0 }}>Ban liên lạc đang cùng thanhxuan.vn chuẩn bị sơ đồ lớp và kho ảnh. Hẹn các bạn quay lại sớm nhé!</p>
            </div>
          </section>
        )}
      </div>
      {daMo && (
        <>
          <SoDoChoNgoi lop={lop} />
          <KhoAnhXua lop={lop} />
          <DongThoiGian lop={lop} />
          <NamNayNamNgoai lop={lop} />
          <TaiHien ds={them.taiHien} />
          <HopThu lop={lop} khoa={ma} laLopMau={laLopMau} />
          <GocThayCo ds={them.thayCo} />
        </>
      )}
      <footer className="chan-trang khung">
        <span className="chu-mo">Trang kỷ niệm của lớp {lop.tenLop}, lưu giữ bởi thanhxuan.vn</span>
        <Link to="/">Tạo trang kỷ niệm cho lớp của bạn</Link>
      </footer>
    </div>
  )
}
