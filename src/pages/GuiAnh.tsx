import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { moLop, matKhauDaLuu, type KetQuaMoLop } from '../lib/lop'
import { guiAnh, MUC_ANH, TOI_DA_ANH, TOI_DA_MB, type TrangThaiAnh } from '../lib/guiAnh'
import { bienCss, layGiaoDien, napFont } from '../themes'
import '../styles/lop.css'

const NHAN_TRANG_THAI: Record<TrangThaiAnh, string> = {
  cho: 'Chờ gửi',
  'dang-nen': 'Đang thu nhỏ…',
  'dang-tai': 'Đang tải lên…',
  xong: 'Đã gửi',
  loi: 'Lỗi, chưa gửi được',
}

export default function GuiAnh() {
  const { ma = '' } = useParams()
  const [kq, setKq] = useState<KetQuaMoLop | undefined>()
  const [mk, setMk] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [trangThai, setTrangThai] = useState<TrangThaiAnh[]>([])
  const [muc, setMuc] = useState('khac')
  const [chuThich, setChuThich] = useState('')
  const [nguoiGui, setNguoiGui] = useState(() => { try { return localStorage.getItem('hoplop:ten') ?? '' } catch { return '' } })
  const [dangGui, setDangGui] = useState(false)
  const [ketQua, setKetQua] = useState<{ thanhCong: number; loi?: string } | null>(null)

  useEffect(() => { moLop(ma).then(setKq) }, [ma])

  const lop = kq?.trangThai === 'ok' ? kq.lop : kq?.trangThai === 'can-mat-khau' ? kq.xemTruoc : null
  const giaoDien = layGiaoDien(lop?.giaoDien)
  const vars = useMemo(() => bienCss(giaoDien), [giaoDien])
  useEffect(() => { if (lop) napFont(lop.giaoDien, giaoDien) }, [lop, giaoDien])

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
    if (!files.length || !lop) return
    setDangGui(true); setKetQua(null)
    try { localStorage.setItem('hoplop:ten', nguoiGui) } catch { /* bỏ qua */ }
    const tt: TrangThaiAnh[] = files.map(() => 'cho')
    const r = await guiAnh(files, { khoa: ma, matKhau: matKhauDaLuu(ma), muc, chuThich, nguoiGui }, (i, t) => {
      tt[i] = t
      setTrangThai([...tt])
    })
    setDangGui(false); setKetQua(r)
    if (!r.loi) {
      // chỉ giữ lại ảnh lỗi để bấm gửi lại
      const conLai = files.filter((_, i) => tt[i] === 'loi')
      setFiles(conLai); setTrangThai(conLai.map(() => 'cho'))
    }
  }

  const moBangMatKhau = async (e: FormEvent) => {
    e.preventDefault()
    setKq(await moLop(ma, mk.trim()))
  }

  if (kq === undefined) return <div className="trang-lop" style={{ ...vars, padding: 40 }}>Đang mở…</div>
  if (!lop)
    return (
      <div className="trang-lop" style={{ ...vars, padding: '60px 24px', textAlign: 'center' }}>
        <h1 className="tieu-de">Không tìm thấy lớp “{ma}”</h1>
        <Link to="/" style={{ color: 'var(--mau-primary)' }}>Về trang chủ</Link>
      </div>
    )

  const kieuO: React.CSSProperties = {
    minHeight: 48, borderRadius: 'var(--bo-sm)', border: '1px solid var(--mau-line)', padding: '0 14px',
    fontSize: 16, fontFamily: 'inherit', background: 'var(--mau-card)', color: 'var(--mau-ink)', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div className="trang-lop" style={vars as React.CSSProperties}>
      <main className="khung" style={{ padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Link to={`/${ma}`} style={{ color: 'var(--mau-primary)', fontSize: 14 }}>← Lớp {lop.tenLop} · {lop.truong}</Link>
        <div className="muc-dau">
          <span className="tieu-de-phu">Còn giữ ảnh nào không?</span>
          <h1 className="tieu-de" style={{ fontSize: 32 }}>Gửi ảnh xưa</h1>
          <span className="chu-mo" style={{ fontSize: 14 }}>Ảnh giấy cứ chụp bằng điện thoại: đủ sáng, chụp thẳng, tránh lóa. Mỗi lần gửi tối đa {TOI_DA_ANH} ảnh.</span>
        </div>

        {kq.trangThai !== 'ok' ? (
          <form className="the" onSubmit={moBangMatKhau} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label htmlFor="mk" style={{ fontWeight: 600 }}>Mật khẩu lớp</label>
            <input id="mk" value={mk} onChange={(e) => setMk(e.target.value)} autoCapitalize="none" style={kieuO} />
            {kq.trangThai === 'can-mat-khau' && kq.daNhapSai && <span role="alert" style={{ color: 'var(--mau-accent)' }}>Mật khẩu chưa đúng.</span>}
            <button className="nut chinh">Tiếp tục</button>
          </form>
        ) : (
          <form onSubmit={gui} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label className="the" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', borderStyle: 'dashed', color: 'var(--mau-primary)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 20h16" /></svg>
              <span style={{ fontWeight: 600 }}>{files.length ? 'Chọn thêm ảnh' : 'Chọn ảnh từ máy'}</span>
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

            <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <legend style={{ fontWeight: 600, marginBottom: 8 }}>Ảnh hồi nào?</legend>
              <div className="tab-hang">
                {MUC_ANH.map((m) => (
                  <button key={m.ma} type="button" className="tab" aria-pressed={muc === m.ma} onClick={() => setMuc(m.ma)}>{m.ten}</button>
                ))}
              </div>
            </fieldset>

            <label htmlFor="chu-thich" style={{ fontWeight: 600 }}>Chuyện hôm đó (không bắt buộc)</label>
            <input id="chu-thich" value={chuThich} onChange={(e) => setChuThich(e.target.value)} placeholder="Vd: Hội trại 26/3, lớp mình giải nhất" style={kieuO} />

            <label htmlFor="ten" style={{ fontWeight: 600 }}>Tên bạn</label>
            <input id="ten" value={nguoiGui} onChange={(e) => setNguoiGui(e.target.value)} placeholder="Vd: Lan Béo" style={kieuO} />

            <p className="chu-mo" style={{ margin: 0, fontSize: 13 }}>Ảnh sẽ được ban liên lạc xem trước khi hiện lên trang lớp.</p>

            {ketQua && (
              <p role="status" className="the" style={{ padding: 14, margin: 0, color: ketQua.loi ? 'var(--mau-accent)' : 'var(--mau-ink)' }}>
                {ketQua.loi ?? (ketQua.thanhCong > 0
                  ? `Đã gửi ${ketQua.thanhCong} ảnh. Cảm ơn bạn!${files.length ? ' Còn vài ảnh lỗi, bạn bấm gửi lại nhé.' : ''}`
                  : 'Chưa gửi được ảnh nào, bạn kiểm tra mạng rồi thử lại nhé.')}
              </p>
            )}

            <button className="nut chinh" style={{ minHeight: 52, fontSize: 16 }} disabled={dangGui || !files.length}>
              {dangGui ? 'Đang gửi, bạn đừng tắt trang…' : files.length ? `Gửi ${files.length} ảnh cho lớp` : 'Chọn ảnh để gửi'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
