/** Thành phần dùng chung của trang quản trị (chủ dịch vụ). */
import { useEffect, useState, type FormEvent } from 'react'
import QRCode from 'qrcode'
import {
  danhSachLop, datTenGoi, themLopTruong, taoPinMoi, xoaLopTruong, tinNhanLopTruong, linkZalo,
  soNgayConLai, tinhTrangHan, type LopQuanTri, type LopTruongQT,
} from '../../lib/quanTri'
import { hienSdt } from '../../lib/lopTruong'
import { CAP_HOC, type CapHoc } from '../../lib/guiAnh'
import { DANH_SACH_GIAO_DIEN, GIAO_DIEN, type MaGiaoDien } from '../../themes'

/** Vòng đời một lớp. 'luu-tru' = đã ẩn (trang lớp không mở được). */
export const TRANG_THAI: Record<string, string> = {
  'thu-tu-lieu': 'Đang thu tư liệu',
  'dang-dung': 'Đang dựng',
  'da-ban-giao': 'Đã bàn giao',
  'chi-xem': 'Chỉ xem',
  'luu-tru': 'Đã ẩn',
}

export const linkLop = (ma: string) => `${window.location.origin}/${ma}`

export const ngayVN = (iso: string | null | undefined) => (iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('vi-VN') : '')

/** Nhãn hạn dùng: "Còn 25 ngày", "Hết hạn 3 ngày trước", "Không hạn" */
export function NhanHan({ hetHan, dai }: { hetHan: string | null | undefined; dai?: boolean }) {
  const tt = tinhTrangHan(hetHan)
  const n = soNgayConLai(hetHan)
  const chu = tt === 'khong-han' ? 'Không đặt hạn'
    : tt === 'het-han' ? `Hết hạn ${-n!} ngày trước`
      : n === 0 ? 'Hết hạn hôm nay' : `Còn ${n} ngày`
  return (
    <span className={`qt-nhan-han ${tt}`}>
      {dai && hetHan ? `${ngayVN(hetHan)} · ` : ''}{chu}
    </span>
  )
}

export function NhanTrangThai({ tt }: { tt: string }) {
  return <span className={`qt-nhan-tt tt-${tt}`}>{TRANG_THAI[tt] ?? tt}</span>
}

export function MaQR({ url, tenFile }: { url: string; tenFile: string }) {
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

export function SaoChep({ text, nhan }: { text: string; nhan: string }) {
  const [xong, setXong] = useState(false)
  return (
    <button type="button" className="qt-nut nho" onClick={() => { navigator.clipboard.writeText(text); setXong(true); setTimeout(() => setXong(false), 1500) }}>
      {xong ? 'Đã chép' : nhan}
    </button>
  )
}

export function NutZalo({ lt }: { lt: LopTruongQT }) {
  return (
    <a className="qt-nut nho" href={linkZalo(lt.sdt)} target="_blank" rel="noreferrer" aria-label={`Nhắn Zalo cho ${lt.ho_ten}, ${hienSdt(lt.sdt)}`}>
      Zalo {lt.ho_ten.split(/\s+/).pop()}
    </a>
  )
}

export function SuaTenGoi({ lop, onDoi }: { lop: LopQuanTri; onDoi: (ten: string | null) => void }) {
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

export function TheTinNhanPin({ lop, hoTen, kq }: { lop: Pick<LopQuanTri, 'ten_lop' | 'truong' | 'ma'>; hoTen: string; kq: { sdt: string; pin: string | null; lop_khac?: string | null } }) {
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
export function QuanLyLopTruong({ lop }: { lop: LopQuanTri }) {
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

export function ChonCapHoc({ value, onChange }: { value: CapHoc; onChange: (v: CapHoc) => void }) {
  return (
    <fieldset className="qt-chon-gd">
      <legend>Cấp học (các mục ảnh xưa hiện theo cấp)</legend>
      {CAP_HOC.map((c) => (
        <label key={c.ma} className={value === c.ma ? 'chon' : ''}>
          <input type="radio" name="cap-hoc" value={c.ma} checked={value === c.ma} onChange={() => onChange(c.ma)} />
          <span><b>{c.ten}</b><small>{c.moTa}</small></span>
        </label>
      ))}
    </fieldset>
  )
}

export function ChonGiaoDien({ value, onChange }: { value: MaGiaoDien; onChange: (v: MaGiaoDien) => void }) {
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

