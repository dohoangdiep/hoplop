import { useEffect, useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import {
  laQuanTriHeThong, danhSachLop, layLop, taoLop, datMatKhau, taoMatKhauLop, capNhatLop, locLop, datTenGoi,
  themLopTruong, taoPinMoi, xoaLopTruong, tinNhanLopTruong, linkZalo,
  type LopQuanTri, type LopDanhSach, type LopTruongQT, type KetQuaThemLT,
} from '../lib/quanTri'
import { hienSdt } from '../lib/lopTruong'
import { DANH_SACH_GIAO_DIEN, GIAO_DIEN, type MaGiaoDien } from '../themes'
import { QuanLyThanhVien, SuaSoDo, QuanLyAnh, QuanLyChuong, QuanLyThu, NutNapDemo, NutXoaDemo, BAT_DEMO } from './QuanTriLop'
import type { ThanhVienQT, ChuongQT } from '../lib/quanTri'
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
function NutZalo({ lt }: { lt: LopTruongQT }) {
  return (
    <a className="qt-nut nho" href={linkZalo(lt.sdt)} target="_blank" rel="noreferrer" aria-label={`Nhắn Zalo cho ${lt.ho_ten}, ${hienSdt(lt.sdt)}`}>
      Zalo {lt.ho_ten.split(/\s+/).pop()}
    </a>
  )
}

function DanhSach() {
  const [ds, setDs] = useState<LopDanhSach[] | null>(null)
  const [loi, setLoi] = useState('')
  const [tim, setTim] = useState('')
  useEffect(() => { danhSachLop().then(setDs).catch((e) => setLoi(e.message)) }, [])
  const loc = ds ? locLop(ds, tim) : []
  const tongCho = ds?.reduce((n, l) => n + l.so_cho_duyet, 0) ?? 0
  return (
    <main className="qt-khung">
      <div className="qt-tieu-de">
        <h1>Các lớp</h1>
        <Link className="qt-nut chinh" to="/quan-tri/tao-lop">Tạo lớp mới</Link>
      </div>
      {loi && <p className="qt-loi">{loi}</p>}
      {ds === null ? (!loi && <p>Đang tải…</p>) : ds.length === 0 ? (
        <p className="qt-mo">Chưa có lớp nào. Bấm “Tạo lớp mới” để bắt đầu.</p>
      ) : (
        <>
          <label htmlFor="tim-lop" className="qt-nhan">Tìm lớp</label>
          <input id="tim-lop" type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder="SĐT lớp trưởng (vài số cuối cũng được), mã lớp, tên lớp, trường…" autoComplete="off" />
          <p className="qt-mo" style={{ fontSize: 13, margin: '6px 0 12px' }}>
            {tim ? `${loc.length}/${ds.length} lớp` : `${ds.length} lớp`}{tongCho ? ` · ${tongCho} ảnh chờ duyệt` : ''}
          </p>
          {loc.length === 0 ? <p className="qt-mo">Không có lớp nào khớp “{tim}”.</p> : (
            <ul className="qt-ds">
              {loc.map((l) => (
                <li key={l.id} className="qt-dong-lop">
                  <Link to={`/quan-tri/lop/${l.id}`}>
                    <strong>
                      Lớp {l.ten_lop} · {l.truong}
                      {l.so_cho_duyet > 0 && <span className="qt-huy-hieu">{l.so_cho_duyet} ảnh chờ duyệt</span>}
                    </strong>
                    <span>{l.nien_khoa_bat_dau}–{l.nien_khoa_ket_thuc} · mã <code>{l.ma}</code> · {TRANG_THAI[l.trang_thai] ?? l.trang_thai}</span>
                    <span>
                      {l.lop_truong.length
                        ? l.lop_truong.map((t) => `${t.ho_ten} · ${hienSdt(t.sdt)}`).join('  ·  ')
                        : 'Chưa có lớp trưởng'}
                    </span>
                  </Link>
                  {l.lop_truong.length > 0 && (
                    <div className="qt-hang qt-dong-zalo">{l.lop_truong.map((t) => <NutZalo key={t.id} lt={t} />)}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
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

/* ---------------- Tên gọi ---------------- */
function SuaTenGoi({ lop, onDoi }: { lop: LopQuanTri; onDoi: (ten: string | null) => void }) {
  const [ten, setTen] = useState(lop.ten_goi ?? '')
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState('')
  const [ok, setOk] = useState('')
  const luu = async (e: FormEvent) => {
    e.preventDefault(); setLoi(''); setOk(''); setDang(true)
    try {
      const moi = await datTenGoi(lop.id, ten)
      onDoi(moi); setTen(moi ?? '')
      setOk(moi ? `Đã lưu. Link mới: ${linkLop(moi)}${lop.ten_goi ? ' (link tên cũ vẫn tự chuyển sang tên mới)' : ''}` : 'Đã bỏ tên gọi.')
    } catch (er) { setLoi((er as Error).message) } finally { setDang(false) }
  }
  return (
    <section className="qt-muc">
      <h2>Tên gọi (link dễ nhớ)</h2>
      <p className="qt-mo" style={{ fontSize: 13, marginTop: 0 }}>
        Tùy chọn, vd <code>12a1-thanhmien</code>. Vào bằng tên gọi luôn phải nhập mật khẩu lớp (vì tên gọi dễ đoán). Mã lớp <code>{lop.ma}</code> và QR đã in vẫn dùng như cũ.
      </p>
      <form onSubmit={luu} className="qt-form">
        <label htmlFor="ten-goi">Tên gọi</label>
        <div className="qt-hang" style={{ flexWrap: 'nowrap' }}>
          <input id="ten-goi" value={ten} onChange={(e) => setTen(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="12a1-thanhmien" autoCapitalize="none" autoCorrect="off" />
          <button className="qt-nut" disabled={dang}>{dang ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
      {ok && <p className="qt-ok" role="status">{ok}</p>}
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </section>
  )
}

/* ---------------- Lớp trưởng: tin nhắn PIN ---------------- */
function TheTinNhanPin({ lop, hoTen, kq }: { lop: Pick<LopQuanTri, 'ten_lop' | 'truong' | 'ma'>; hoTen: string; kq: { sdt: string; pin: string | null; lop_khac?: string | null } }) {
  const tin = tinNhanLopTruong({ hoTen, sdt: kq.sdt, pin: kq.pin, tenLop: lop.ten_lop, truong: lop.truong, ma: lop.ma })
  return (
    <div className="qt-the qt-form">
      <p style={{ margin: 0 }}>
        <b>{hoTen}</b> · {hienSdt(kq.sdt)} · {kq.pin ? <>mã PIN <code>{kq.pin}</code></> : <>dùng chung mã PIN với {kq.lop_khac ?? 'lớp khác'}</>}
      </p>
      {kq.pin && <p className="qt-mo" style={{ fontSize: 13, margin: 0 }}>Ghi lại hoặc gửi ngay: hệ thống chỉ lưu dạng mã hóa, không xem lại được (chỉ tạo mã mới được).</p>}
      <pre className="qt-tin-nhan">{tin}</pre>
      <div className="qt-hang">
        <SaoChep text={tin} nhan="Chép tin nhắn" />
        <a className="qt-nut nho" href={linkZalo(kq.sdt)} target="_blank" rel="noreferrer">Mở Zalo của {hoTen.split(/\s+/).pop()}</a>
      </div>
    </div>
  )
}

/** Thêm/xóa lớp trưởng, tạo PIN mới. Tối đa 2 người mỗi lớp. */
function QuanLyLopTruong({ lop }: { lop: LopQuanTri }) {
  const [ds, setDs] = useState<LopTruongQT[] | null>(null)
  const [hoTen, setHoTen] = useState('')
  const [sdt, setSdt] = useState('')
  const [moi, setMoi] = useState<{ hoTen: string; kq: { sdt: string; pin: string | null; lop_khac?: string | null } } | null>(null)
  const [loi, setLoi] = useState('')
  const [dang, setDang] = useState(false)
  const tai = async () => {
    const all = await danhSachLop()
    setDs(all.find((l) => l.id === lop.id)?.lop_truong ?? [])
  }
  useEffect(() => { tai().catch((e) => setLoi(e.message)) }, [lop.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const them = async (e: FormEvent) => {
    e.preventDefault(); setLoi(''); setDang(true)
    try {
      const kq = await themLopTruong(lop.id, hoTen, sdt)
      setMoi({ hoTen: hoTen.trim(), kq }); setHoTen(''); setSdt(''); await tai()
    } catch (er) { setLoi((er as Error).message) } finally { setDang(false) }
  }
  const pinMoi = async (t: LopTruongQT) => {
    if (!window.confirm(`Tạo mã PIN mới cho ${t.ho_ten}? Mã cũ hết dùng được, các máy đang đăng nhập sẽ phải đăng nhập lại.`)) return
    setLoi('')
    try { const r = await taoPinMoi(t.id); setMoi({ hoTen: t.ho_ten, kq: { sdt: r.sdt, pin: r.pin } }) }
    catch (er) { setLoi((er as Error).message) }
  }
  const xoa = async (t: LopTruongQT) => {
    if (!window.confirm(`Bỏ quyền lớp trưởng của ${t.ho_ten} ở lớp này?`)) return
    setLoi('')
    try { await xoaLopTruong(t.id); setMoi(null); await tai() } catch (er) { setLoi((er as Error).message) }
  }

  return (
    <section className="qt-muc">
      <h2>Lớp trưởng ({ds?.length ?? 0}/2)</h2>
      <p className="qt-mo" style={{ fontSize: 13, marginTop: 0 }}>Lớp trưởng đăng nhập ở <code>/lop-truong</code> bằng SĐT + mã PIN để duyệt ảnh, tạo buổi họp và lấy mã QR. SĐT không hiện trên trang lớp.</p>
      {ds === null ? <p>Đang tải…</p> : ds.length > 0 && (
        <ul className="qt-ds-tv">
          {ds.map((t) => (
            <li key={t.id}>
              <div><strong>{t.ho_ten}</strong><span>{hienSdt(t.sdt)}</span></div>
              <div className="qt-hang">
                <a className="qt-nut nho" href={linkZalo(t.sdt)} target="_blank" rel="noreferrer">Zalo</a>
                <button type="button" className="qt-nut nho" onClick={() => pinMoi(t)}>Tạo PIN mới</button>
                <button type="button" className="qt-nut nho nguy" onClick={() => xoa(t)}>Xóa</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {moi && <div style={{ marginTop: 12 }}><TheTinNhanPin lop={lop} hoTen={moi.hoTen} kq={moi.kq} /></div>}
      {ds && ds.length < 2 && (
        <form onSubmit={them} className="qt-form" style={{ marginTop: 8 }}>
          <div className="qt-hai-cot">
            <div><label htmlFor="lt-ten">Họ tên</label><input id="lt-ten" required value={hoTen} onChange={(e) => setHoTen(e.target.value)} placeholder="Nguyễn Thị Lan" /></div>
            <div><label htmlFor="lt-sdt">Số điện thoại</label><input id="lt-sdt" required type="tel" inputMode="tel" value={sdt} onChange={(e) => setSdt(e.target.value)} placeholder="0912 345 678" /></div>
          </div>
          <button className="qt-nut" disabled={dang}>{dang ? 'Đang thêm…' : ds.length ? 'Thêm lớp phó' : 'Thêm lớp trưởng'}</button>
        </form>
      )}
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </section>
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
  const [lt, setLt] = useState([{ hoTen: '', sdt: '' }, { hoTen: '', sdt: '' }])
  const [ketQua, setKetQua] = useState<{ lop: LopQuanTri; matKhau: string; lopTruong: { hoTen: string; kq: KetQuaThemLT }[]; loiLt: string[] } | null>(null)
  const doiLt = (i: number, k: 'hoTen' | 'sdt', v: string) => setLt(lt.map((x, j) => (j === i ? { ...x, [k]: v } : x)))

  const gui = async (e: FormEvent) => {
    e.preventDefault()
    setLoi('')
    const dsLt = lt.filter((x) => x.hoTen.trim() || x.sdt.trim())
    if (dsLt.some((x) => !x.hoTen.trim() || !x.sdt.trim())) { setLoi('Lớp trưởng cần đủ cả họ tên và số điện thoại (hoặc để trống cả hai).'); return }
    setDang(true)
    try {
      const r = await taoLop({
        tenLop, truong, tinh, giaoDien: gd,
        nienKhoaBatDau: bd ? Number(bd) : null,
        nienKhoaKetThuc: kt ? Number(kt) : null,
      })
      const lopTruong: { hoTen: string; kq: KetQuaThemLT }[] = []
      const loiLt: string[] = []
      for (const x of dsLt) {
        try { lopTruong.push({ hoTen: x.hoTen.trim(), kq: await themLopTruong(r.lop.id, x.hoTen, x.sdt) }) }
        catch (er) { loiLt.push(`${x.hoTen}: ${(er as Error).message}`) }
      }
      setKetQua({ ...r, lopTruong, loiLt })
    } catch (e) {
      setLoi((e as Error).message)
    } finally { setDang(false) }
  }

  if (ketQua) {
    const url = linkLop(ketQua.lop.ma)
    const tinNhan = `Trang kỷ niệm lớp ${ketQua.lop.ten_lop} · ${ketQua.lop.truong}\nLink cho cả lớp (bấm là vào, không cần mật khẩu): ${url}`
    return (
      <main className="qt-khung qt-hep">
        <h1>Đã tạo lớp {ketQua.lop.ten_lop}</h1>
        <dl className="qt-tt">
          <dt>Mã lớp</dt><dd><code>{ketQua.lop.ma}</code></dd>
          <dt>Link</dt><dd><a href={url}>{url}</a></dd>
          <dt>Mật khẩu lớp</dt><dd><code>{ketQua.matKhau}</code></dd>
        </dl>
        <p className="qt-mo">Mật khẩu lớp chỉ cần khi vào bằng tên gọi hoặc khi bật “Luôn cần mật khẩu”. Hệ thống chỉ lưu dạng mã hóa, không xem lại được (chỉ đặt lại được).</p>

        <h2>Lớp trưởng</h2>
        {ketQua.lopTruong.length === 0 && !ketQua.loiLt.length && <p className="qt-mo">Chưa thêm lớp trưởng. Thêm sau ở trang quản lý lớp.</p>}
        <div className="qt-form">
          {ketQua.lopTruong.map((x) => <TheTinNhanPin key={x.kq.id} lop={ketQua.lop} hoTen={x.hoTen} kq={x.kq} />)}
        </div>
        {ketQua.loiLt.map((l) => <p key={l} className="qt-loi" role="alert">{l}</p>)}

        <h2 style={{ marginTop: 20 }}>Link cho cả lớp</h2>
        <div className="qt-hang">
          <SaoChep text={tinNhan} nhan="Chép tin nhắn gửi nhóm Zalo lớp" />
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
        <fieldset className="qt-fieldset">
          <legend>Lớp trưởng (tối đa 2, có thể thêm sau)</legend>
          {lt.map((x, i) => (
            <div className="qt-hai-cot" key={i}>
              <div><label htmlFor={`lt-ten-${i}`}>{i === 0 ? 'Lớp trưởng' : 'Lớp phó (không bắt buộc)'}</label>
                <input id={`lt-ten-${i}`} value={x.hoTen} onChange={(e) => doiLt(i, 'hoTen', e.target.value)} placeholder="Họ tên" /></div>
              <div><label htmlFor={`lt-sdt-${i}`}>Số điện thoại</label>
                <input id={`lt-sdt-${i}`} type="tel" inputMode="tel" value={x.sdt} onChange={(e) => doiLt(i, 'sdt', e.target.value)} placeholder="0912 345 678" /></div>
            </div>
          ))}
          <p className="qt-mo" style={{ fontSize: 13, margin: '8px 0 0' }}>Hệ thống sinh mã PIN 6 số và soạn sẵn tin nhắn Zalo để bạn gửi riêng.</p>
        </fieldset>
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
  const [chuong, setChuong] = useState<ChuongQT[]>([])
  useEffect(() => { layLop(id).then(setLop).catch(() => setLop(null)) }, [id])

  if (lop === undefined) return <main className="qt-khung">Đang tải…</main>
  if (lop === null) return <main className="qt-khung">Không tìm thấy lớp hoặc bạn không có quyền.</main>
  const url = linkLop(lop.ma)

  const doiGiaoDien = async (gd: MaGiaoDien) => {
    await capNhatLop(lop.id, { giao_dien: gd }); setLop({ ...lop, giao_dien: gd }); setThongBao('Đã đổi giao diện.')
  }
  const doiLuonCanMk = async (bat: boolean) => {
    await capNhatLop(lop.id, { luon_can_mat_khau: bat }); setLop({ ...lop, luon_can_mat_khau: bat })
    setThongBao(bat ? 'Đã bật: mọi người vào lớp đều phải nhập mật khẩu (trừ lớp trưởng và người quét QR buổi họp để gửi ảnh).' : 'Đã tắt: vào bằng mã lớp không cần mật khẩu.')
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

      <QuanLyLopTruong lop={lop} />
      <SuaTenGoi lop={lop} onDoi={(t) => setLop({ ...lop, ten_goi: t })} />

      <section className="qt-muc">
        <h2>Mật khẩu lớp</h2>
        <p className="qt-mo" style={{ fontSize: 13, marginTop: 0 }}>
          Vào bằng mã lớp (<code>{lop.ma}</code>, link hoặc QR) thì không cần mật khẩu. Mật khẩu chỉ hỏi khi vào bằng tên gọi{lop.ten_goi ? <> (<code>{lop.ten_goi}</code>)</> : ''}, hoặc khi bật công tắc dưới đây.
        </p>
        <label className="qt-chon" htmlFor="luon-can-mk">
          <input id="luon-can-mk" type="checkbox" checked={!!lop.luon_can_mat_khau} onChange={(e) => doiLuonCanMk(e.target.checked)} />
          Luôn cần mật khẩu (dùng khi link lớp bị lộ ra ngoài)
        </label>
        {matKhauMoi ? (
          <p>Mật khẩu mới: <code>{matKhauMoi}</code> <SaoChep text={matKhauMoi} nhan="Chép" /></p>
        ) : (
          <button className="qt-nut" onClick={datLaiMatKhau} style={{ marginTop: 8 }}>Đặt lại mật khẩu lớp</button>
        )}
      </section>

      <section className="qt-muc">
        <h2>Mã QR vào trang lớp</h2>
        <MaQR url={url} tenFile={`qr-lop-${lop.ma}.png`} />
      </section>

      <QuanLyThanhVien lopId={lop.id} lopMa={lop.ma} onDoi={setThanhVien} />
      <SuaSoDo lopId={lop.id} thanhVien={thanhVien} />
      <QuanLyChuong lopId={lop.id} maLop={lop.ma} tenLop={lop.ten_lop} truong={lop.truong} onDoi={setChuong} />
      <QuanLyAnh lopId={lop.id} maLop={lop.ma} thanhVien={thanhVien} chuong={chuong} />
      <QuanLyThu lopId={lop.id} chuong={chuong} />

      <section className="qt-muc">
        <h2>Dữ liệu demo</h2>
        {BAT_DEMO && <NutNapDemo lops={[lop]} nhan="Nạp ảnh demo cho lớp này" />}
        <NutXoaDemo lop={lop} />
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
            <h1>Trang này dành cho người dựng trang</h1>
            <p>Tài khoản <b>{phien.user.email}</b> chưa có quyền quản trị hệ thống.</p>
            <p>Nếu bạn là lớp trưởng, hãy vào <Link to="/lop-truong">trang lớp trưởng</Link> và đăng nhập bằng số điện thoại + mã PIN. Các bạn trong lớp chỉ cần link hoặc mã QR của lớp, không cần đăng nhập.</p>
            <button className="qt-nut" onClick={() => supabase.auth.signOut()}>Đăng xuất</button>
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
