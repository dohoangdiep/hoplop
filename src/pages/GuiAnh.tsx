import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { matKhauDaLuu } from '../lib/lop'
import { tokenLopTruong } from '../lib/lopTruong'
import {
  guiAnh, MUC_ANH, TOI_DA_ANH, TOI_DA_MB, maNoiAnh, giaiNoiAnh, ghiAnhDaGui, tinhTrangAnhDaGui,
  type TrangThaiAnh, type KetQuaGui, type AnhDaGui,
} from '../lib/guiAnh'
import { linkXemNhieu } from '../lib/storage'
import { bienCss, layGiaoDien, napFont, type MaGiaoDien } from '../themes'
import { LOP_MAU, MA_LOP_MAU } from '../data/lopMau'
import '../styles/lop.css'

const NHAN_TRANG_THAI: Record<TrangThaiAnh, string> = {
  cho: 'Chờ gửi',
  'dang-nen': 'Đang thu nhỏ…',
  'dang-tai': 'Đang tải lên…',
  xong: 'Đã gửi',
  loi: 'Lỗi, chưa gửi được',
}

interface BuoiHop { id: string; tieu_de: string; ngay: string | null; dia_diem: string | null }
interface ThongTin {
  vai: 'thanh-vien' | 'lop-truong' | 'quan-tri'
  nhan_anh: boolean
  chon_chuong_id: string | null
  ma_qr_sai: boolean
  ho_ten: string | null
  lop: { ma: string; ten_lop: string; truong: string; giao_dien: MaGiaoDien }
  chuong: BuoiHop[]
}
type TrangThaiTrang =
  | { kieu: 'dang-mo' }
  | { kieu: 'ok'; tt: ThongTin }
  | { kieu: 'can-mat-khau' | 'tam-khoa'; lop: ThongTin['lop']; saiRoi: boolean }
  | { kieu: 'khong-tim-thay' | 'loi-mang' }

const homNay = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const ngayVN = (iso: string | null) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('vi-VN') : '')

const khoaMk = (k: string) => `hoplop:mk:${k.toLowerCase()}`

/** Lớp mẫu chỉ để xem thử: dựng thông tin từ dữ liệu mẫu, không gửi thật */
function thongTinLopMau(): ThongTin {
  return {
    vai: 'thanh-vien', nhan_anh: true, chon_chuong_id: null, ma_qr_sai: false, ho_ten: null,
    lop: { ma: LOP_MAU.ma, ten_lop: LOP_MAU.tenLop, truong: LOP_MAU.truong, giao_dien: LOP_MAU.giaoDien },
    chuong: LOP_MAU.chuong.map((c) => ({ id: c.id, tieu_de: c.tieuDe, ngay: c.ngay || null, dia_diem: c.diaDiem ?? null })),
  }
}

/**
 * Một trang gửi ảnh chung cho lớp: ảnh thời đi học hoặc ảnh một lần họp lớp (kể cả buổi đã qua).
 * Vào từ QR buổi họp (/:ma/q/:chuongMa) thì buổi đó được chọn sẵn và không cần mật khẩu.
 */
export default function GuiAnh() {
  const { ma = '', chuongMa } = useParams()
  const [timKiem] = useSearchParams()
  const laLopMau = ma.toLowerCase() === MA_LOP_MAU
  const [trang, setTrang] = useState<TrangThaiTrang>({ kieu: 'dang-mo' })
  const [mk, setMk] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [trangThai, setTrangThai] = useState<TrangThaiAnh[]>([])
  const [noi, setNoi] = useState<string | null>(null) // giá trị maNoiAnh; null = chưa chọn
  const [chuThich, setChuThich] = useState('')
  const [nguoiGui, setNguoiGui] = useState(() => { try { return localStorage.getItem('hoplop:ten') ?? '' } catch { return '' } })
  const [dangGui, setDangGui] = useState(false)
  const [ketQua, setKetQua] = useState<KetQuaGui | null>(null)
  const [canChon, setCanChon] = useState(false)
  const [daGui, setDaGui] = useState<(AnhDaGui & { url?: string })[]>([])

  const mo = useCallback(async (matKhau?: string) => {
    if (laLopMau) { setTrang({ kieu: 'ok', tt: thongTinLopMau() }); return }
    const { data, error } = await supabase.rpc('thong_tin_gui_anh', {
      p_khoa: ma, p_mat_khau: matKhau ?? matKhauDaLuu(ma), p_ma_qr: chuongMa ?? null, p_token: tokenLopTruong(),
    })
    if (error || !data) { setTrang({ kieu: error?.code === 'PGRST202' ? 'khong-tim-thay' : 'loi-mang' }); return }
    if (data.loi === 'khong-tim-thay') { setTrang({ kieu: 'khong-tim-thay' }); return }
    if (data.loi === 'can-mat-khau' || data.loi === 'tam-khoa') {
      setTrang({ kieu: data.loi, lop: data.lop, saiRoi: !!matKhau })
      return
    }
    if (matKhau) { try { localStorage.setItem(khoaMk(ma), matKhau) } catch { /* bỏ qua */ } }
    const tt = data as ThongTin
    setTrang({ kieu: 'ok', tt })
    const buoi = tt.chon_chuong_id ?? timKiem.get('buoi')
    if (buoi && tt.chuong.some((c) => c.id === buoi)) setNoi(maNoiAnh({ chuongId: buoi }))
    if (tt.vai === 'lop-truong' && tt.ho_ten) setNguoiGui(tt.ho_ten)
  }, [ma, chuongMa, laLopMau, timKiem])

  useEffect(() => { mo() }, [mo])

  const taiAnhDaGui = useCallback(async () => {
    if (laLopMau) return
    const ds = await tinhTrangAnhDaGui(ma)
    const url = await linkXemNhieu(ds.map((a) => a.xem))
    setDaGui(ds.map((a) => ({ ...a, url: a.xem ? url[a.xem] : undefined })))
  }, [ma, laLopMau])
  useEffect(() => { taiAnhDaGui() }, [taiAnhDaGui])

  const lopHien = trang.kieu === 'ok' ? trang.tt.lop : trang.kieu === 'can-mat-khau' || trang.kieu === 'tam-khoa' ? trang.lop : null
  const giaoDien = layGiaoDien(lopHien?.giao_dien)
  const vars = useMemo(() => bienCss(giaoDien), [giaoDien])
  useEffect(() => { if (lopHien) napFont(lopHien.giao_dien, giaoDien) }, [lopHien, giaoDien])
  useEffect(() => { if (lopHien) document.title = `Gửi ảnh · Lớp ${lopHien.ten_lop}` }, [lopHien])
  useEffect(() => {
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow'
    document.head.appendChild(m); return () => m.remove()
  }, [])

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

  if (trang.kieu === 'dang-mo') return <div className="trang-lop" style={{ ...vars, padding: 40 }}>Đang mở…</div>
  if (trang.kieu === 'khong-tim-thay' || trang.kieu === 'loi-mang')
    return (
      <div className="trang-lop" style={{ ...vars, padding: '60px 24px', textAlign: 'center' }}>
        <h1 className="tieu-de">{trang.kieu === 'loi-mang' ? 'Chưa kết nối được' : `Không tìm thấy lớp “${ma}”`}</h1>
        <p className="chu-mo">{trang.kieu === 'loi-mang' ? 'Mạng đang chập chờn, bạn tải lại trang nhé.' : 'Bạn kiểm tra lại đường link, hoặc quét lại mã QR nhé.'}</p>
        <Link to="/" style={{ color: 'var(--mau-primary)' }}>Về trang chủ</Link>
      </div>
    )

  const kieuO: React.CSSProperties = {
    minHeight: 48, borderRadius: 'var(--bo-sm)', border: '1px solid var(--mau-line)', padding: '0 14px',
    fontSize: 16, fontFamily: 'inherit', background: 'var(--mau-card)', color: 'var(--mau-ink)', width: '100%', boxSizing: 'border-box',
  }
  const lop = lopHien!
  const tt = trang.kieu === 'ok' ? trang.tt : null
  const buoiChonSan = tt?.chon_chuong_id ? tt.chuong.find((c) => c.id === tt.chon_chuong_id) : undefined
  const duyetSan = tt?.vai === 'lop-truong' || tt?.vai === 'quan-tri'
  // Chỉ hiện các buổi đã diễn ra (hoặc hôm nay), cộng buổi QR chọn sẵn / đang chọn
  const dsBuoi = (tt?.chuong ?? []).filter((c) => !c.ngay || c.ngay <= homNay() || c.id === tt?.chon_chuong_id || noi === `chuong:${c.id}`)

  const gui = async (e: FormEvent) => {
    e.preventDefault()
    if (!files.length || !tt) return
    if (noi === null) { setCanChon(true); return }
    if (laLopMau) { setKetQua({ thanhCong: 0, ids: [], loi: 'Đây là lớp mẫu để xem thử nên không nhận ảnh thật. Trang của lớp bạn sẽ gửi được như thế này!' }); return }
    setDangGui(true); setKetQua(null)
    try { localStorage.setItem('hoplop:ten', nguoiGui.trim()) } catch { /* bỏ qua */ }
    const dsTt: TrangThaiAnh[] = files.map(() => 'cho')
    const n = giaiNoiAnh(noi)
    const r = await guiAnh(files, {
      khoa: ma, matKhau: matKhauDaLuu(ma), maQr: chuongMa ?? null,
      chuongId: 'chuongId' in n ? n.chuongId : null, muc: 'muc' in n ? n.muc : null,
      chuThich, nguoiGui: nguoiGui.trim(), tokenLopTruong: tokenLopTruong(),
    }, (i, t) => { dsTt[i] = t; setTrangThai([...dsTt]) })
    setDangGui(false); setKetQua(r)
    ghiAnhDaGui(ma, r.ids)
    if (!r.loi) {
      // chỉ giữ lại ảnh lỗi để bấm gửi lại
      const conLai = files.filter((_, i) => dsTt[i] === 'loi')
      setFiles(conLai); setTrangThai(conLai.map(() => 'cho'))
      if (!conLai.length) setChuThich('')
    }
    taiAnhDaGui()
  }

  const moBangMatKhau = async (e: FormEvent) => {
    e.preventDefault()
    if (mk.trim()) await mo(mk.trim())
  }

  const choDuyet = daGui.filter((a) => a.trangThai === 'cho-duyet').length

  return (
    <div className="trang-lop" style={vars as React.CSSProperties}>
      <main className="khung gui-anh">
        <Link to={`/${lop.ma}`} className="lien-ket-ve">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Lớp {lop.ten_lop} · {lop.truong}
        </Link>
        <div className="muc-dau">
          {buoiChonSan ? (
            <>
              <span className="tieu-de-phu">Chụp được ảnh nào đẹp không?</span>
              <h1 className="tieu-de" style={{ fontSize: 30 }}>{buoiChonSan.tieu_de}</h1>
              <span className="chu-mo" style={{ fontSize: 14 }}>{[ngayVN(buoiChonSan.ngay), buoiChonSan.dia_diem].filter(Boolean).join(' · ')}</span>
            </>
          ) : (
            <>
              <span className="tieu-de-phu">Còn giữ ảnh nào không?</span>
              <h1 className="tieu-de" style={{ fontSize: 32 }}>Gửi ảnh cho lớp</h1>
              <span className="chu-mo" style={{ fontSize: 14 }}>Ảnh thời đi học hay ảnh các lần họp lớp đều được. Ảnh giấy cứ chụp bằng điện thoại: đủ sáng, chụp thẳng, tránh lóa.</span>
            </>
          )}
        </div>

        {trang.kieu === 'tam-khoa' ? (
          <p className="the" style={{ padding: 18, margin: 0 }}>Có nhiều lần nhập sai mật khẩu. Bạn đợi khoảng 10 phút rồi thử lại nhé.</p>
        ) : trang.kieu === 'can-mat-khau' ? (
          <form className="the" onSubmit={moBangMatKhau} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label htmlFor="mk" style={{ fontWeight: 600 }}>Mật khẩu lớp</label>
            <span className="chu-mo" style={{ fontSize: 14 }}>Ban liên lạc gửi mật khẩu trong nhóm Zalo của lớp. Máy này sẽ nhớ cho lần sau.</span>
            <input id="mk" value={mk} onChange={(e) => setMk(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" style={kieuO} />
            {trang.saiRoi && <span role="alert" style={{ color: 'var(--mau-accent)' }}>Mật khẩu chưa đúng, bạn thử lại nhé.</span>}
            <button className="nut chinh">Tiếp tục</button>
          </form>
        ) : !tt!.nhan_anh ? (
          <p className="the" style={{ padding: 18, margin: 0 }}>Trang lớp đang ở chế độ chỉ xem nên tạm ngừng nhận ảnh.</p>
        ) : (
          <form onSubmit={gui} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
            {tt!.ma_qr_sai && (
              <p className="the" role="status" style={{ padding: 14, margin: 0, fontSize: 14 }}>Mã QR này không còn khớp với buổi họp nào. Bạn vẫn gửi ảnh được, chọn buổi họp ở bên dưới nhé.</p>
            )}
            {duyetSan && (
              <p className="the" style={{ padding: 14, margin: 0, fontSize: 14 }}>
                Bạn đang gửi với vai trò {tt!.vai === 'lop-truong' ? 'lớp trưởng' : 'quản trị'}: ảnh hiện lên trang lớp ngay, không cần duyệt.
              </p>
            )}

            <label className="the o-chon-anh">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 20h16" /></svg>
              <span style={{ fontWeight: 600 }}>{files.length ? 'Chọn thêm ảnh' : 'Chọn ảnh trong máy'}</span>
              <span className="chu-mo">{files.length}/{TOI_DA_ANH} ảnh · mỗi lần tối đa {TOI_DA_ANH} ảnh</span>
              <input type="file" accept="image/*" multiple className="an-di" onChange={(e) => { chonAnh(e.target.files); e.target.value = '' }} />
            </label>

            {files.length > 0 && (
              <div className="luoi-anh">
                {files.map((f, i) => (
                  <figure key={i + f.name}>
                    <div className="khung-anh xua" style={{ position: 'relative' }}>
                      <img src={xemTruoc[i]} alt="" />
                      {!dangGui && trangThai[i] !== 'xong' && (
                        <button type="button" className="nut-bo-anh" onClick={() => boAnh(i)} aria-label="Bỏ ảnh này">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                      )}
                    </div>
                    <figcaption style={{ color: trangThai[i] === 'loi' ? 'var(--mau-accent)' : undefined }}>{NHAN_TRANG_THAI[trangThai[i] ?? 'cho']}</figcaption>
                  </figure>
                ))}
              </div>
            )}

            <fieldset className="chon-hoi-nao" aria-describedby={canChon && noi === null ? 'can-chon' : undefined}>
              <legend>Ảnh này chụp hồi nào?</legend>
              <span className="nhom">Thời đi học</span>
              <div className="tab-hang">
                {MUC_ANH.map((m) => {
                  const v = maNoiAnh({ muc: m.ma })
                  return <button key={v} type="button" className="tab" aria-pressed={noi === v} onClick={() => setNoi(v)}>{m.ten}</button>
                })}
              </div>
              {dsBuoi.length > 0 && (
                <>
                  <span className="nhom">Các lần họp lớp</span>
                  <div className="tab-hang">
                    {dsBuoi.map((c) => {
                      const v = maNoiAnh({ chuongId: c.id })
                      return (
                        <button key={v} type="button" className="tab" aria-pressed={noi === v} onClick={() => setNoi(v)}>
                          {c.tieu_de}{c.ngay && !c.tieu_de.includes(c.ngay.slice(0, 4)) ? ` · ${c.ngay.slice(0, 4)}` : ''}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
              <div className="tab-hang">
                <button type="button" className="tab" aria-pressed={noi === 'khong-ro'} onClick={() => setNoi('khong-ro')}>Không nhớ rõ</button>
              </div>
              {canChon && noi === null && <span id="can-chon" role="alert" style={{ color: 'var(--mau-accent)', fontSize: 14 }}>Bạn chọn giúp ảnh chụp hồi nào nhé (không nhớ thì chọn “Không nhớ rõ”).</span>}
            </fieldset>

            <label htmlFor="chu-thich" style={{ fontWeight: 600 }}>Chuyện hôm đó (không bắt buộc)</label>
            <input id="chu-thich" value={chuThich} onChange={(e) => setChuThich(e.target.value)} placeholder="Vd: Hội trại 26/3, lớp mình giải nhất" style={kieuO} />

            <label htmlFor="ten" style={{ fontWeight: 600 }}>Tên bạn</label>
            <input id="ten" value={nguoiGui} onChange={(e) => setNguoiGui(e.target.value)} placeholder="Vd: Lan Béo" autoComplete="nickname" style={kieuO} />

            {!duyetSan && <p className="chu-mo" style={{ margin: 0, fontSize: 13 }}>Ảnh sẽ được lớp trưởng xem qua trước khi hiện lên trang lớp, để không bạn nào bị ngại.</p>}

            {ketQua && (
              <p role="status" className="the" style={{ padding: 14, margin: 0, color: ketQua.loi ? 'var(--mau-accent)' : 'var(--mau-ink)' }}>
                {ketQua.loi ?? (ketQua.thanhCong > 0
                  ? `Đã gửi ${ketQua.thanhCong} ảnh. Cảm ơn bạn!${ketQua.daDuyet ? ' Ảnh đã lên trang lớp.' : ' Ảnh sẽ lên trang lớp sau khi lớp trưởng xem qua.'}${files.length ? ' Còn vài ảnh lỗi, bạn bấm gửi lại nhé.' : ''}`
                  : 'Chưa gửi được ảnh nào. Mạng hơi yếu, bạn thử lại nhé.')}
              </p>
            )}

            <button className="nut chinh" style={{ minHeight: 52, fontSize: 16 }} disabled={dangGui || !files.length}>
              {dangGui ? 'Đang gửi, bạn đừng tắt trang…' : files.length ? `Gửi ${files.length} ảnh cho lớp` : 'Chọn ảnh để gửi'}
            </button>
          </form>
        )}

        {daGui.length > 0 && (
          <section className="anh-da-gui" aria-labelledby="tieu-de-da-gui">
            <h2 id="tieu-de-da-gui" className="tieu-de" style={{ fontSize: 20, margin: 0 }}>Ảnh bạn đã gửi</h2>
            <p className="chu-mo" style={{ margin: 0, fontSize: 14 }}>
              {choDuyet > 0 ? `${choDuyet} ảnh đang chờ lớp trưởng xem qua. Bạn không cần gửi lại nhé.` : 'Các ảnh bạn gửi từ máy này.'}
            </p>
            <div className="luoi-anh">
              {daGui.slice(0, 30).map((a) => (
                <figure key={a.id}>
                  <div className="khung-anh xua">{a.url ? <img src={a.url} alt="" loading="lazy" /> : null}</div>
                  <figcaption>{a.trangThai === 'cho-duyet' ? 'Đang chờ duyệt' : a.trangThai === 'da-duyet' ? 'Đã lên trang lớp' : 'Không đưa lên'}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
