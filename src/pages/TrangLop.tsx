import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { timLop } from '../lib/lop'
import type { Lop } from '../lib/types'
import { bienCss, layGiaoDien, napFont, DANH_SACH_GIAO_DIEN, GIAO_DIEN, type MaGiaoDien } from '../themes'
import { Bia, SapHopLop, SoDoChoNgoi, KhoAnhXua, DongThoiGian } from '../components/KhoiTrangLop'
import { MA_LOP_MAU } from '../data/lopMau'
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

export default function TrangLop() {
  const { ma = '' } = useParams()
  const [tim] = useSearchParams()
  const [lop, setLop] = useState<Lop | null | undefined>(undefined)
  useNoIndex()

  useEffect(() => {
    let huy = false
    setLop(undefined)
    timLop(ma).then((l) => !huy && setLop(l))
    return () => { huy = true }
  }, [ma])

  const laLopMau = lop?.ma === MA_LOP_MAU
  // Lớp mẫu cho phép xem thử mẫu giao diện khác qua ?giao-dien=...
  const maGiaoDien = (laLopMau && tim.get('giao-dien')) || lop?.giaoDien || 'hoai-niem'
  const giaoDien = layGiaoDien(maGiaoDien)
  const vars = useMemo(() => bienCss(giaoDien), [giaoDien])

  useEffect(() => { napFont(maGiaoDien, giaoDien) }, [maGiaoDien, giaoDien])
  useEffect(() => { if (lop) document.title = `Lớp ${lop.tenLop} · ${lop.truong}` }, [lop])

  if (lop === undefined) return <div className="trang-lop" style={{ ...vars, padding: 40 }}>Đang mở trang lớp…</div>

  if (lop === null)
    return (
      <div className="trang-lop" style={{ ...vars, padding: '60px 24px', textAlign: 'center' }}>
        <h1 className="tieu-de">Không tìm thấy lớp “{ma}”</h1>
        <p className="chu-mo" style={{ fontSize: 15 }}>Bạn kiểm tra lại mã lớp trên thư mời hoặc quét lại mã QR nhé.</p>
        <Link to="/" style={{ color: 'var(--mau-primary)' }}>Về trang chủ</Link>
      </div>
    )

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
      <div className="khung">
        <Bia lop={lop} kieu={giaoDien.kieuBia} />
        <SapHopLop lop={lop} />
      </div>
      <SoDoChoNgoi lop={lop} />
      <KhoAnhXua lop={lop} />
      <DongThoiGian lop={lop} />
      <footer className="chan-trang khung">
        <span className="chu-mo">Trang kỷ niệm của lớp {lop.tenLop}, lưu giữ bởi thanhxuan.vn</span>
        <Link to="/">Tạo trang kỷ niệm cho lớp của bạn</Link>
      </footer>
    </div>
  )
}
