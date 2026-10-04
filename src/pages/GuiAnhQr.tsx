import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { guiAnh, TOI_DA_ANH, TOI_DA_MB, type TrangThaiAnh } from '../lib/guiAnh'
import { bienCss, layGiaoDien, napFont, type MaGiaoDien } from '../themes'
import '../styles/lop.css'

const NHAN_TRANG_THAI: Record<TrangThaiAnh, string> = {
  cho: 'Chờ gửi',
  'dang-nen': 'Đang thu nhỏ…',
  'dang-tai': 'Đang tải lên…',
  xong: 'Đã gửi',
  loi: 'Lỗi, chưa gửi được',
}

interface ThongTinQr {
  lop: { ma: string; ten_lop: string; truong: string; giao_dien: MaGiaoDien }
  chuong: { tieu_de: string; ngay: string | null; dia_diem: string | null }
  trang_thai: 'mo' | 'chua-mo' | 'het-han' | 'chi-xem'
  mo_tu: string | null
}

/** Trang khách quét QR tại buổi họp: gửi ảnh thẳng vào chương, không cần mật khẩu hay tài khoản. */
export default function GuiAnhQr() {
  const { ma = '', chuongMa = '' } = useParams()
  const [tt, setTt] = useState<ThongTinQr | null | undefined>(undefined)
  const [files, setFiles] = useState<File[]>([])
  const [trangThai, setTrangThai] = useState<TrangThaiAnh[]>([])
  const [chuThich, setChuThich] = useState('')
  const [nguoiGui, setNguoiGui] = useState(() => { try { return localStorage.getItem('hoplop:ten') ?? '' } catch { return '' } })
  const [dangGui, setDangGui] = useState(false)
  const [ketQua, setKetQua] = useState<{ thanhCong: number; loi?: string } | null>(null)
  const [tongDaGui, setTongDaGui] = useState(0)

  useEffect(() => {
    supabase.rpc('thong_tin_qr', { p_khoa: ma, p_ma_qr: chuongMa })
      .then(({ data, error }) => setTt(error || !data || data.loi ? null : data as ThongTinQr))
  }, [ma, chuongMa])

  const giaoDien = layGiaoDien(tt?.lop.giao_dien)
  const vars = useMemo(() => bienCss(giaoDien), [giaoDien])
  useEffect(() => { if (tt) napFont(tt.lop.giao_dien, giaoDien) }, [tt, giaoDien])

  const xemTruoc = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => xemTruoc.forEach(URL.revokeObjectURL), [xemTruoc])

  const chonAnh = (ds: FileList | null) => {
    if (!ds) return
    const hopLe = [...ds].filter((f) => (f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name)) && f.size <= TOI_DA_MB * 1024 * 1024)
    const moi = [...files, ...hopLe].slice(0, TOI_DA_ANH)
    setFiles(moi); setTrangThai(moi.map(() => 'cho')); setKetQua(null)
  }
  const boAnh = (i: number) => {
    const moi = files.filter((_, j) => j !== i)
    setFiles(moi); setTrangThai(moi.map(() => 'cho'))
  }

  const gui = async (e: FormEvent) => {
    e.preventDefault()
    if (!files.length) return
    setDangGui(true); setKetQua(null)
    try { localStorage.setItem('hoplop:ten', nguoiGui) } catch { /* bỏ qua */ }
    const dsTt: TrangThaiAnh[] = files.map(() => 'cho')
    const r = await guiAnh(files, { khoa: ma, maQr: chuongMa, chuThich, nguoiGui }, (i, t) => {
      dsTt[i] = t
      setTrangThai([...dsTt])
    })
    setDangGui(false); setKetQua(r); setTongDaGui((n) => n + r.thanhCong)
    if (!r.loi) {
      const conLai = files.filter((_, i) => dsTt[i] === 'loi')
      setFiles(conLai); setTrangThai(conLai.map(() => 'cho'))
    }
  }

  if (tt === undefined) return <div className="trang-lop" style={{ ...vars, padding: 40 }}>Đang mở…</div>
  if (!tt)
    return (
      <div className="trang-lop" style={{ ...vars, padding: '60px 24px', textAlign: 'center' }}>
        <h1 className="tieu-de">Mã QR không đúng</h1>
        <p className="chu-mo">Bạn quét lại mã QR tại buổi họp, hoặc hỏi ban liên lạc nhé.</p>
        <Link to="/" style={{ color: 'var(--mau-primary)' }}>Về trang chủ</Link>
      </div>
    )

  const kieuO: React.CSSProperties = {
    minHeight: 48, borderRadius: 'var(--bo-sm)', border: '1px solid var(--mau-line)', padding: '0 14px',
    fontSize: 16, fontFamily: 'inherit', background: 'var(--mau-card)', color: 'var(--mau-ink)', width: '100%', boxSizing: 'border-box',
  }
  const ngay = tt.chuong.ngay ? new Date(tt.chuong.ngay).toLocaleDateString('vi-VN') : ''
  const dongLai = {
    'chua-mo': `Mã QR này bắt đầu nhận ảnh từ ${tt.mo_tu ? new Date(tt.mo_tu).toLocaleString('vi-VN') : 'ngày họp lớp'}. Bạn quay lại sau nhé!`,
    'het-han': 'Buổi họp này đã ngừng nhận ảnh qua QR. Bạn còn ảnh thì gửi cho ban liên lạc nhé.',
    'chi-xem': 'Trang lớp đang ở chế độ chỉ xem nên tạm ngừng nhận ảnh.',
  } as const

  return (
    <div className="trang-lop" style={vars as React.CSSProperties}>
      <main className="khung" style={{ padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span className="chu-mo" style={{ fontSize: 14 }}>Lớp {tt.lop.ten_lop} · {tt.lop.truong}</span>
        <div className="muc-dau">
          <span className="tieu-de-phu">Chụp được ảnh nào đẹp không?</span>
          <h1 className="tieu-de" style={{ fontSize: 30 }}>{tt.chuong.tieu_de}</h1>
          <span className="chu-mo" style={{ fontSize: 14 }}>{[ngay, tt.chuong.dia_diem].filter(Boolean).join(' · ')}</span>
        </div>

        {tt.trang_thai !== 'mo' ? (
          <p className="the" style={{ padding: 18, margin: 0 }}>{dongLai[tt.trang_thai]}</p>
        ) : (
          <form onSubmit={gui} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p className="chu-mo" style={{ margin: 0, fontSize: 14 }}>
              Gửi ảnh vào album chung của buổi họp hôm nay. Không cần cài app hay đăng nhập. Mỗi lần tối đa {TOI_DA_ANH} ảnh.
            </p>
            <label className="the" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', borderStyle: 'dashed', color: 'var(--mau-primary)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 20h16" /></svg>
              <span style={{ fontWeight: 600 }}>{files.length ? 'Chọn thêm ảnh' : 'Chọn ảnh trong máy'}</span>
              <span className="chu-mo">{files.length}/{TOI_DA_ANH} ảnh</span>
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { chonAnh(e.target.files); e.target.value = '' }} />
            </label>

            {files.length > 0 && (
              <div className="luoi-anh">
                {files.map((f, i) => (
                  <figure key={i + f.name}>
                    <div className="khung-anh xua" style={{ position: 'relative' }}>
                      <img src={xemTruoc[i]} alt="" />
                      {!dangGui && trangThai[i] !== 'xong' && (
                        <button type="button" onClick={() => boAnh(i)} aria-label="Bỏ ảnh này"
                          style={{ position: 'absolute', top: 4, right: 4, width: 32, height: 32, borderRadius: 16, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer' }}>×</button>
                      )}
                    </div>
                    <figcaption style={{ color: trangThai[i] === 'loi' ? 'var(--mau-accent)' : undefined }}>{NHAN_TRANG_THAI[trangThai[i] ?? 'cho']}</figcaption>
                  </figure>
                ))}
              </div>
            )}

            <label htmlFor="ten" style={{ fontWeight: 600 }}>Tên bạn</label>
            <input id="ten" value={nguoiGui} onChange={(e) => setNguoiGui(e.target.value)} placeholder="Vd: Lan Béo" style={kieuO} />

            <label htmlFor="chu-thich" style={{ fontWeight: 600 }}>Vài chữ về ảnh (không bắt buộc)</label>
            <input id="chu-thich" value={chuThich} onChange={(e) => setChuThich(e.target.value)} placeholder="Vd: Bàn cuối vẫn ồn nhất" style={kieuO} />

            {ketQua && (
              <p role="status" className="the" style={{ padding: 14, margin: 0, color: ketQua.loi ? 'var(--mau-accent)' : 'var(--mau-ink)' }}>
                {ketQua.loi ?? (ketQua.thanhCong > 0
                  ? `Đã gửi ${ketQua.thanhCong} ảnh. Cảm ơn bạn! Ảnh sẽ lên album sau khi ban liên lạc xem qua.${files.length ? ' Còn vài ảnh lỗi, bạn bấm gửi lại nhé.' : ''}`
                  : 'Chưa gửi được ảnh nào. Mạng ở đây hơi yếu, bạn thử lại nhé.')}
              </p>
            )}

            <button className="nut chinh" style={{ minHeight: 52, fontSize: 16 }} disabled={dangGui || !files.length}>
              {dangGui ? 'Đang gửi, bạn đừng tắt trang…' : files.length ? `Gửi ${files.length} ảnh vào album` : 'Chọn ảnh để gửi'}
            </button>
            {tongDaGui > 0 && !files.length && <span className="chu-mo" style={{ textAlign: 'center' }}>Bạn đã gửi {tongDaGui} ảnh. Chụp thêm thì gửi tiếp nhé!</span>}
          </form>
        )}

        <Link to={`/${tt.lop.ma}`} style={{ color: 'var(--mau-primary)', fontSize: 14, textAlign: 'center' }}>Vào trang lớp {tt.lop.ten_lop}</Link>
      </main>
    </div>
  )
}
