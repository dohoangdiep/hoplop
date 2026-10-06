import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  dangNhap, dangXuat, cacLopCuaToi, duLieuLop, doiTrangThaiAnh, xepAnh, xoaAnhLT, luuBuoiHop, xoaBuoiHop, datAnhTapThe,
  tokenLopTruong, HetPhien, type LopCuaToi, type DuLieuLT, type AnhLT, type ChuongLT, type BuoiHopSua,
} from '../lib/lopTruong'
import { mucAnh, tenMuc, maNoiAnh, giaiNoiAnh, noiCuaAnh, type CapHoc } from '../lib/guiAnh'
import { linkXemNhieu } from '../lib/storage'
import { linkQrChuong, veToQr } from '../lib/toQr'
import { bienCss, layGiaoDien, napFont, type MaGiaoDien } from '../themes'
import { TaiHienThayCo } from './LopTruongThem'
import '../styles/lop.css'
import '../styles/loptruong.css'

/* ---------------- Khung chung ---------------- */
function useKhung(giaoDien?: MaGiaoDien) {
  const g = layGiaoDien(giaoDien)
  const vars = useMemo(() => bienCss(g), [g])
  useEffect(() => { napFont(giaoDien ?? 'hoai-niem', g) }, [giaoDien, g])
  useEffect(() => {
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex, nofollow'
    document.head.appendChild(m); return () => m.remove()
  }, [])
  return vars as React.CSSProperties
}

const Icon = {
  mat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  len: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="M6 10l6-6 6 6" /><path d="M4 20h16" /></svg>,
  trai: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>,
  phai: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>,
  dong: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
}

const ngayVN = (iso: string | null) => (iso ? new Date(iso.length > 10 ? iso : iso + 'T00:00:00').toLocaleDateString('vi-VN') : '')

/* ---------------- Đăng nhập ---------------- */
function DangNhap({ onXong, thongBao }: { onXong: (ds: LopCuaToi[]) => void; thongBao?: string }) {
  const vars = useKhung()
  const [sdt, setSdt] = useState('')
  const [pin, setPin] = useState('')
  const [loi, setLoi] = useState('')
  const [dang, setDang] = useState(false)
  useEffect(() => { document.title = 'Lớp trưởng đăng nhập · thanhxuan.vn' }, [])

  const gui = async (e: FormEvent) => {
    e.preventDefault()
    setLoi('')
    if (!/^\d{6}$/.test(pin.trim())) { setLoi('Mã PIN gồm 6 chữ số.'); return }
    setDang(true)
    const r = await dangNhap(sdt, pin)
    setDang(false)
    if (r.ok) onXong(r.lop)
    else { setLoi(r.loi); setPin('') }
  }

  return (
    <div className="trang-lop lt" style={vars}>
      <main className="khung lt-hep">
        <div className="muc-dau">
          <span className="tieu-de-phu">Dành cho lớp trưởng</span>
          <h1 className="tieu-de" style={{ fontSize: 30 }}>Đăng nhập lớp trưởng</h1>
          <span className="chu-mo" style={{ fontSize: 15 }}>Duyệt ảnh các bạn gửi, tạo buổi họp và lấy mã QR. Nhập một lần, máy này sẽ nhớ.</span>
        </div>
        {thongBao && <p className="the lt-the" role="status">{thongBao}</p>}
        <form className="the lt-form" onSubmit={gui}>
          <label htmlFor="sdt">Số điện thoại của bạn</label>
          <input id="sdt" type="tel" inputMode="tel" autoComplete="tel" value={sdt} onChange={(e) => setSdt(e.target.value)} placeholder="0912 345 678" required />
          <label htmlFor="pin">Mã PIN (6 số)</label>
          <input id="pin" type="password" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
          {loi && <span role="alert" className="lt-loi">{loi}</span>}
          <button className="nut chinh lt-nut-lon" disabled={dang}>{dang ? 'Đang kiểm tra…' : 'Đăng nhập'}</button>
        </form>
        <p className="chu-mo" style={{ fontSize: 14, margin: 0 }}>
          Chưa có hoặc quên mã PIN? Nhắn người dựng trang cho lớp để được tạo mã mới. Các bạn trong lớp không cần đăng nhập: chỉ cần link hoặc mã QR của lớp.
        </p>
        <Link to="/" className="lien-ket-ve">Về trang chủ</Link>
      </main>
    </div>
  )
}

/* ---------------- Chọn lớp ---------------- */
function ChonLop({ ds, onDangXuat }: { ds: LopCuaToi[]; onDangXuat: () => void }) {
  const vars = useKhung(ds[0]?.giao_dien)
  if (ds.length === 1) return <Navigate to={`/lop-truong/${ds[0].ma}`} replace />
  return (
    <div className="trang-lop lt" style={vars}>
      <main className="khung lt-hep">
        <div className="muc-dau">
          <span className="tieu-de-phu">Chào {ds[0]?.ho_ten ?? 'bạn'}</span>
          <h1 className="tieu-de" style={{ fontSize: 28 }}>{ds.length ? 'Bạn muốn vào lớp nào?' : 'Chưa có lớp nào'}</h1>
        </div>
        {ds.length === 0 && <p className="chu-mo">Số điện thoại này chưa là lớp trưởng của lớp nào đang hoạt động.</p>}
        <ul className="lt-ds-lop">
          {ds.map((l) => (
            <li key={l.id}>
              <Link to={`/lop-truong/${l.ma}`} className="the">
                <strong>Lớp {l.ten_lop} · {l.truong}</strong>
                <span className="chu-mo">{l.nien_khoa_ket_thuc ? `Ra trường ${l.nien_khoa_ket_thuc}` : ''}{l.so_cho_duyet ? ` · ${l.so_cho_duyet} ảnh chờ duyệt` : ''}</span>
              </Link>
            </li>
          ))}
        </ul>
        <button type="button" className="lt-link" onClick={onDangXuat}>Đăng xuất khỏi máy này</button>
      </main>
    </div>
  )
}

/* ---------------- Ảnh: chọn "thuộc đâu" ---------------- */
function ChonNoiAnh({ id, value, chuong, cap, onChange, disabled }: {
  id: string; value: string; chuong: ChuongLT[]; cap?: CapHoc; onChange: (v: string) => void; disabled?: boolean
}) {
  return (
    <select id={id} className="lt-select" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <optgroup label="Thời đi học">
        {mucAnh(cap).map((m) => <option key={m.ma} value={maNoiAnh({ muc: m.ma })}>{m.ten}</option>)}
        {value.startsWith('muc:') && !mucAnh(cap).some((m) => `muc:${m.ma}` === value) && <option value={value}>{tenMuc(value.slice(4), cap)}</option>}
      </optgroup>
      {chuong.length > 0 && (
        <optgroup label="Các lần họp lớp">
          {chuong.map((c) => <option key={c.id} value={maNoiAnh({ chuongId: c.id })}>{c.tieu_de}</option>)}
        </optgroup>
      )}
      <option value="khong-ro">Chưa rõ</option>
    </select>
  )
}

const tenNoi = (a: AnhLT, tenChuong: Map<string, string>, cap?: CapHoc) =>
  a.loai === 'chuong' && a.chuong_id ? (tenChuong.get(a.chuong_id) ?? 'Buổi họp') : tenMuc(a.muc, cap)

const TAB_ANH: { ma: AnhLT['trang_thai']; ten: string }[] = [
  { ma: 'cho-duyet', ten: 'Chờ duyệt' },
  { ma: 'da-duyet', ten: 'Đã lên trang' },
  { ma: 'an', ten: 'Đã ẩn' },
]

/* ---------------- Duyệt ảnh ---------------- */
function DuyetAnh({ dl, url, lam }: {
  dl: DuLieuLT; url: Record<string, string>; lam: (viec: () => Promise<unknown>, thongBao?: string) => Promise<boolean>
}) {
  const [tab, setTab] = useState<AnhLT['trang_thai']>('cho-duyet')
  const [loc, setLoc] = useState('tat-ca')
  const [mo, setMo] = useState<string | null>(null)
  const tenChuong = useMemo(() => new Map(dl.chuong.map((c) => [c.id, c.tieu_de])), [dl.chuong])

  const theoLoc = dl.anh.filter((a) =>
    loc === 'tat-ca' ? true : loc === 'xua' ? a.loai === 'xua' : loc === 'khong-ro' ? a.loai === 'xua' && !a.muc : a.chuong_id === loc)
  const ds = theoLoc.filter((a) => a.trang_thai === tab)
  const dem = (t: AnhLT['trang_thai']) => theoLoc.filter((a) => a.trang_thai === t).length
  const viTri = mo ? ds.findIndex((a) => a.id === mo) : -1
  const anh = viTri >= 0 ? ds[viTri] : undefined

  // Sau khi duyệt/ẩn một ảnh, tự sang ảnh kế tiếp trong danh sách đang xem
  const roiSangKe = (viec: () => Promise<unknown>, tb?: string) => {
    const ke = ds[viTri + 1]?.id ?? ds[viTri - 1]?.id ?? null
    return lam(async () => { await viec(); setMo(ke) }, tb)
  }

  useEffect(() => {
    if (!anh) return
    const phim = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMo(null)
      if (e.key === 'ArrowRight' && ds[viTri + 1]) setMo(ds[viTri + 1].id)
      if (e.key === 'ArrowLeft' && ds[viTri - 1]) setMo(ds[viTri - 1].id)
    }
    window.addEventListener('keydown', phim)
    return () => window.removeEventListener('keydown', phim)
  }, [anh, ds, viTri])

  return (
    <section aria-labelledby="tieu-de-anh" className="lt-phan">
      <h2 id="tieu-de-anh" className="an-di">Duyệt ảnh</h2>
      <div className="tab-hang" role="group" aria-label="Lọc theo trạng thái">
        {TAB_ANH.map((t) => (
          <button key={t.ma} type="button" className="tab lt-tab" aria-pressed={tab === t.ma} onClick={() => { setTab(t.ma); setMo(null) }}>
            {t.ten} ({dem(t.ma)})
          </button>
        ))}
      </div>
      <label htmlFor="loc-thuoc" className="lt-nhan">Ảnh của</label>
      <select id="loc-thuoc" className="lt-select" value={loc} onChange={(e) => { setLoc(e.target.value); setMo(null) }}>
        <option value="tat-ca">Tất cả</option>
        <option value="xua">Kho ảnh xưa</option>
        <option value="khong-ro">Chưa rõ chụp hồi nào</option>
        {dl.chuong.map((c) => <option key={c.id} value={c.id}>{c.tieu_de}</option>)}
      </select>

      {tab === 'cho-duyet' && ds.length > 1 && (
        <button type="button" className="nut chinh lt-nut-lon" onClick={() => {
          if (window.confirm(`Đưa cả ${ds.length} ảnh này lên trang lớp?`))
            lam(() => doiTrangThaiAnh(dl.lop.id, ds.map((a) => a.id), 'da-duyet'), `Đã đưa ${ds.length} ảnh lên trang lớp.`)
        }}>Duyệt tất cả {ds.length} ảnh</button>
      )}

      {tab === 'an' && ds.length > 0 && (
        <button type="button" className="nut lt-nut-vien lt-nguy lt-nut-lon" onClick={() => {
          if (window.confirm(`Xóa hẳn cả ${ds.length} ảnh đã ẩn? Ảnh sẽ mất vĩnh viễn, không lấy lại được.`))
            lam(() => xoaAnhLT(dl.lop.id, ds.map((a) => a.id)), `Đã xóa hẳn ${ds.length} ảnh.`)
        }}>Xóa hẳn tất cả {ds.length} ảnh đã ẩn</button>
      )}

      {ds.length === 0 ? (
        <p className="chu-mo lt-trong">
          {tab === 'cho-duyet' ? 'Không có ảnh nào đang chờ. Khi các bạn gửi ảnh, ảnh sẽ nằm ở đây để bạn xem trước.' : 'Không có ảnh nào.'}
        </p>
      ) : (
        <ul className="lt-luoi" aria-label="Danh sách ảnh">
          {ds.map((a) => (
            <li key={a.id}>
              <button type="button" className="lt-o-anh khung-anh xua" onClick={() => setMo(a.id)}
                aria-label={`Xem ảnh${a.nguoi_gui_ten ? ' của ' + a.nguoi_gui_ten : ''}, ${tenNoi(a, tenChuong, dl.lop.cap)}`}>
                {url[a.xem] ? <img src={url[a.xem]} alt="" loading="lazy" /> : <span className="lt-khong-anh">Ảnh</span>}
                <small>{tenNoi(a, tenChuong, dl.lop.cap)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}

      {anh && (
        <div className="lt-xem" role="dialog" aria-modal="true" aria-label="Xem và duyệt ảnh">
          <div className="lt-xem-dau">
            <span>{viTri + 1}/{ds.length}</span>
            <button type="button" className="lt-nut-tron" onClick={() => setMo(null)} aria-label="Đóng">{Icon.dong}</button>
          </div>
          <div className="lt-xem-anh">
            <button type="button" className="lt-nut-tron" disabled={viTri === 0} onClick={() => setMo(ds[viTri - 1].id)} aria-label="Ảnh trước">{Icon.trai}</button>
            {url[anh.xem] ? <img src={url[anh.xem]} alt={anh.chu_thich ?? ''} /> : <span className="lt-khong-anh">Không tải được ảnh</span>}
            <button type="button" className="lt-nut-tron" disabled={viTri === ds.length - 1} onClick={() => setMo(ds[viTri + 1].id)} aria-label="Ảnh sau">{Icon.phai}</button>
          </div>
          <div className="lt-xem-than">
            <p className="lt-xem-tt">
              <b>{anh.nguoi_gui_ten || 'Không ghi tên'}</b> gửi lúc {new Date(anh.tao_luc).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
              {anh.chu_thich && <><br />“{anh.chu_thich}”</>}
            </p>
            <label htmlFor="noi-anh" className="lt-nhan">Ảnh này chụp hồi nào</label>
            <ChonNoiAnh id="noi-anh" value={maNoiAnh(noiCuaAnh(anh))} chuong={dl.chuong} cap={dl.lop.cap}
              onChange={(v) => lam(() => xepAnh(dl.lop.id, [anh.id], giaiNoiAnh(v)), 'Đã chuyển ảnh.')} />
            <div className="lt-hang-nut">
              {anh.trang_thai !== 'da-duyet' && (
                <button type="button" className="nut chinh" onClick={() => roiSangKe(() => doiTrangThaiAnh(dl.lop.id, [anh.id], 'da-duyet'))}>
                  {anh.trang_thai === 'an' ? 'Hiện lại' : 'Duyệt, đưa lên trang'}
                </button>
              )}
              {anh.trang_thai !== 'an' && (
                <button type="button" className="nut lt-nut-vien" onClick={() => roiSangKe(() => doiTrangThaiAnh(dl.lop.id, [anh.id], 'an'))}>Ẩn ảnh này</button>
              )}
            </div>
            <button type="button" className="lt-link lt-nguy-chu" onClick={() => {
              if (window.confirm('Xóa hẳn ảnh này? Ảnh sẽ mất vĩnh viễn, không lấy lại được. (Muốn chỉ cất đi thì bấm "Ẩn ảnh này".)'))
                roiSangKe(() => xoaAnhLT(dl.lop.id, [anh.id]), 'Đã xóa hẳn ảnh.')
            }}>Xóa hẳn ảnh này</button>
            {anh.loai === 'chuong' && anh.chuong_id && (
              <button type="button" className="lt-link" onClick={() => lam(() => datAnhTapThe(dl.lop.id, anh.chuong_id!, anh.id), 'Đã đặt làm ảnh tập thể của buổi họp.')}>
                {dl.chuong.find((c) => c.id === anh.chuong_id)?.anh_tap_the_id === anh.id ? 'Đây là ảnh tập thể của buổi này' : 'Đặt làm ảnh tập thể của buổi này'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

/* ---------------- Buổi họp ---------------- */
function FormBuoiHop({ dau, onLuu, onHuy }: { dau?: ChuongLT; onLuu: (c: BuoiHopSua) => Promise<boolean>; onHuy: () => void }) {
  const [f, setF] = useState({
    tieu_de: dau?.tieu_de ?? '', ngay: dau?.ngay ?? '', dia_diem: dau?.dia_diem ?? '', mo_ta: dau?.mo_ta ?? '', video_url: dau?.video_url ?? '',
  })
  const [dang, setDang] = useState(false)
  const doi = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const id = (k: string) => `bh-${k}-${dau?.id ?? 'moi'}`
  const luu = async (e: FormEvent) => {
    e.preventDefault()
    setDang(true)
    await onLuu({
      tieu_de: f.tieu_de.trim(), ngay: f.ngay || null, dia_diem: f.dia_diem.trim() || null,
      mo_ta: f.mo_ta.trim() || null, video_url: f.video_url.trim() || null,
    })
    setDang(false)
  }
  return (
    <form className="the lt-form" onSubmit={luu}>
      <label htmlFor={id('td')}>Tên buổi họp</label>
      <input id={id('td')} required value={f.tieu_de} onChange={doi('tieu_de')} placeholder="Họp lớp 20 năm · Tết 2027" />
      <label htmlFor={id('ng')}>Ngày</label>
      <input id={id('ng')} type="date" value={f.ngay} onChange={doi('ngay')} />
      <label htmlFor={id('dd')}>Địa điểm</label>
      <input id={id('dd')} value={f.dia_diem} onChange={doi('dia_diem')} placeholder="Nhà hàng …" />
      <label htmlFor={id('mt')}>Vài dòng về buổi họp (không bắt buộc)</label>
      <textarea id={id('mt')} rows={3} value={f.mo_ta} onChange={doi('mo_ta')} />
      <label htmlFor={id('vd')}>Link video (không bắt buộc)</label>
      <input id={id('vd')} inputMode="url" value={f.video_url} onChange={doi('video_url')} placeholder="https://" />
      <div className="lt-hang-nut">
        <button className="nut chinh" disabled={dang}>{dang ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" className="nut lt-nut-vien" onClick={onHuy}>Hủy</button>
      </div>
    </form>
  )
}

function ToQr({ c, lop }: { c: ChuongLT; lop: DuLieuLT['lop'] }) {
  const [src, setSrc] = useState('')
  const [daChep, setDaChep] = useState(false)
  const url = linkQrChuong(lop.ma, c.ma_qr)
  const phu = [ngayVN(c.ngay), c.dia_diem].filter(Boolean).join(' · ')
  useEffect(() => { veToQr(url, lop.ten_lop, lop.truong, c.tieu_de, phu).then(setSrc) }, [url, lop.ten_lop, lop.truong, c.tieu_de, phu])
  const chiaSe = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: c.tieu_de, text: `Gửi ảnh buổi ${c.tieu_de} cho lớp mình:`, url }); return }
    } catch { return }
    await navigator.clipboard.writeText(url); setDaChep(true); setTimeout(() => setDaChep(false), 1500)
  }
  return (
    <div className="lt-qr">
      {src ? <img src={src} alt={`Tờ mã QR gửi ảnh cho ${c.tieu_de}`} /> : <p className="chu-mo">Đang tạo mã QR…</p>}
      <div className="lt-hang-nut">
        {src && <a className="nut chinh" href={src} download={`qr-${lop.ma}-${c.ma_qr.slice(0, 6)}.png`}>Tải tờ QR để in</a>}
        <button type="button" className="nut lt-nut-vien" onClick={chiaSe}>{daChep ? 'Đã chép link' : 'Gửi link vào nhóm Zalo'}</button>
      </div>
      <p className="chu-mo" style={{ fontSize: 13, margin: 0 }}>In ra đặt ở bàn tiệc, hoặc gửi link vào nhóm Zalo. Các bạn quét là gửi được ảnh vào buổi này, không cần cài app. Ảnh các bạn gửi sẽ chờ bạn duyệt.</p>
    </div>
  )
}

function BuoiHop({ dl, lam }: { dl: DuLieuLT; lam: (viec: () => Promise<unknown>, thongBao?: string) => Promise<boolean> }) {
  const [sua, setSua] = useState<string | null>(null) // id buổi, hoặc 'moi'
  const [qr, setQr] = useState<string | null>(null)
  return (
    <section aria-labelledby="tieu-de-buoi" className="lt-phan">
      <div className="lt-tieu-de">
        <h2 id="tieu-de-buoi" className="tieu-de" style={{ fontSize: 22, margin: 0 }}>Các lần họp lớp</h2>
        {sua !== 'moi' && <button type="button" className="nut chinh lt-nut-gon" onClick={() => setSua('moi')}>Thêm buổi họp</button>}
      </div>
      <p className="chu-mo" style={{ fontSize: 14, margin: 0 }}>Mỗi buổi là một chương trên trang lớp, có album và mã QR riêng để cả lớp gửi ảnh.</p>

      {sua === 'moi' && (
        <FormBuoiHop onHuy={() => setSua(null)} onLuu={async (c) => {
          let id = ''
          const ok = await lam(async () => { id = (await luuBuoiHop(dl.lop.id, null, c)).id }, 'Đã tạo buổi họp. Lấy tờ QR ở bên dưới nhé.')
          if (ok) { setSua(null); setQr(id) }
          return ok
        }} />
      )}

      {dl.chuong.length === 0 && sua !== 'moi' && <p className="chu-mo lt-trong">Chưa có buổi họp nào. Bấm “Thêm buổi họp” trước ngày họp để in mã QR nhé.</p>}
      <ul className="lt-ds-buoi">
        {dl.chuong.map((c) => (
          <li key={c.id} className="the">
            {sua === c.id ? (
              <FormBuoiHop dau={c} onHuy={() => setSua(null)} onLuu={async (m) => {
                const ok = await lam(() => luuBuoiHop(dl.lop.id, c.id, m), 'Đã lưu.')
                if (ok) setSua(null)
                return ok
              }} />
            ) : (
              <>
                <strong>{c.tieu_de}</strong>
                <span className="chu-mo">{[c.ngay ? ngayVN(c.ngay) : 'Chưa có ngày', c.dia_diem, `${c.so_anh} ảnh`].filter(Boolean).join(' · ')}</span>
                <div className="lt-hang-nut">
                  <button type="button" className={`nut ${qr === c.id ? 'chinh' : 'lt-nut-vien'}`} aria-expanded={qr === c.id} onClick={() => setQr(qr === c.id ? null : c.id)}>Mã QR gửi ảnh</button>
                  <button type="button" className="nut lt-nut-vien" onClick={() => setSua(c.id)}>Sửa</button>
                  {c.so_anh === 0 && (
                    <button type="button" className="nut lt-nut-vien lt-nguy" onClick={() => {
                      if (window.confirm(`Xóa “${c.tieu_de}”? Mã QR của buổi này (nếu đã in) sẽ không dùng được nữa.`))
                        lam(() => xoaBuoiHop(dl.lop.id, c.id), 'Đã xóa buổi họp.')
                    }}>Xóa</button>
                  )}
                </div>
                {qr === c.id && <ToQr c={c} lop={dl.lop} />}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------- Trang một lớp ---------------- */
function TrangMotLop({ dsLop, onHetPhien, onDangXuat }: { dsLop: LopCuaToi[]; onHetPhien: () => void; onDangXuat: () => void }) {
  const { ma = '' } = useParams()
  const lopCua = dsLop.find((l) => l.ma === ma)
  const vars = useKhung(lopCua?.giao_dien)
  const [dl, setDl] = useState<DuLieuLT | null>(null)
  const [url, setUrl] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'anh' | 'buoi' | 'them'>('anh')
  const [loi, setLoi] = useState('')
  const [thongBao, setThongBao] = useState('')

  const tai = useCallback(async () => {
    if (!lopCua) return
    try {
      const d = await duLieuLop(lopCua.id)
      setDl(d)
      setUrl(await linkXemNhieu(d.anh.map((a) => a.xem), 3600, tokenLopTruong()))
      setLoi('')
    } catch (e) {
      if (e instanceof HetPhien) onHetPhien()
      else setLoi((e as Error).message)
    }
  }, [lopCua, onHetPhien])
  useEffect(() => { tai() }, [tai])
  useEffect(() => { if (lopCua) document.title = `Lớp trưởng · Lớp ${lopCua.ten_lop}` }, [lopCua])

  const lam = useCallback(async (viec: () => Promise<unknown>, tb?: string) => {
    setLoi(''); setThongBao('')
    try {
      await viec()
      if (tb) { setThongBao(tb); setTimeout(() => setThongBao(''), 3000) }
      await tai()
      return true
    } catch (e) {
      if (e instanceof HetPhien) onHetPhien()
      else setLoi((e as Error).message)
      return false
    }
  }, [tai, onHetPhien])

  if (!lopCua) return <Navigate to="/lop-truong" replace />
  const soCho = dl ? dl.anh.filter((a) => a.trang_thai === 'cho-duyet').length : lopCua.so_cho_duyet

  return (
    <div className="trang-lop lt" style={vars}>
      <header className="lt-dau">
        <div className="khung lt-dau-trong">
          <div>
            <span className="tieu-de-phu">Lớp trưởng · {dl?.ho_ten ?? lopCua.ho_ten}</span>
            <h1 className="tieu-de" style={{ fontSize: 24, margin: 0 }}>Lớp {lopCua.ten_lop} · {lopCua.truong}</h1>
          </div>
          <nav className="lt-loi-tat" aria-label="Lối tắt">
            <Link to={`/${lopCua.ma}`}>{Icon.mat} Xem trang lớp</Link>
            <Link to={`/${lopCua.ma}/gui-anh`}>{Icon.len} Gửi ảnh</Link>
          </nav>
        </div>
        <div className="khung tab-hang lt-tab-chinh" role="tablist" aria-label="Việc của lớp trưởng">
          <button type="button" role="tab" className="tab lt-tab" aria-selected={tab === 'anh'} onClick={() => setTab('anh')}>
            Duyệt ảnh{soCho ? ` (${soCho})` : ''}
          </button>
          <button type="button" role="tab" className="tab lt-tab" aria-selected={tab === 'buoi'} onClick={() => setTab('buoi')}>
            Buổi họp & mã QR
          </button>
          <button type="button" role="tab" className="tab lt-tab" aria-selected={tab === 'them'} onClick={() => setTab('them')}>
            Tái hiện & thầy cô
          </button>
        </div>
      </header>

      <main className="khung lt-than">
        {thongBao && <p className="the lt-the" role="status">{thongBao}</p>}
        {loi && <p className="the lt-the lt-loi" role="alert">{loi}</p>}
        {!dl ? <p className="chu-mo">{loi ? '' : 'Đang tải…'}</p>
          : tab === 'anh' ? <DuyetAnh dl={dl} url={url} lam={lam} />
          : tab === 'buoi' ? <BuoiHop dl={dl} lam={lam} />
          : <TaiHienThayCo dl={dl} url={url} lam={lam} onHetPhien={onHetPhien} />}

        <div className="lt-chan">
          {dsLop.length > 1 && <Link to="/lop-truong" className="lt-link">Đổi lớp</Link>}
          <button type="button" className="lt-link" onClick={onDangXuat}>Đăng xuất khỏi máy này</button>
        </div>
      </main>
    </div>
  )
}

/* ---------------- Khung trang lớp trưởng ---------------- */
export default function LopTruong() {
  const [ds, setDs] = useState<LopCuaToi[] | null | undefined>(undefined)
  const [thongBao, setThongBao] = useState('')
  const [loiMang, setLoiMang] = useState(false)
  const dieuHuong = useNavigate()

  useEffect(() => {
    cacLopCuaToi().then(setDs).catch(() => setLoiMang(true))
  }, [])

  const hetPhien = useCallback(() => {
    setThongBao('Phiên đăng nhập đã hết hoặc mã PIN vừa được đổi. Bạn đăng nhập lại nhé.')
    setDs(null)
    dieuHuong('/lop-truong', { replace: true })
  }, [dieuHuong])
  const xuat = useCallback(async () => {
    await dangXuat()
    setThongBao(''); setDs(null)
    dieuHuong('/lop-truong', { replace: true })
  }, [dieuHuong])

  if (loiMang) return <div className="trang-lop" style={{ padding: 40 }}>Chưa kết nối được. Bạn kiểm tra mạng rồi tải lại trang nhé.</div>
  if (ds === undefined) return <div className="trang-lop" style={{ padding: 40 }}>Đang mở…</div>
  if (ds === null) return <DangNhap thongBao={thongBao} onXong={(l) => { setThongBao(''); setDs(l) }} />

  return (
    <Routes>
      <Route index element={<ChonLop ds={ds} onDangXuat={xuat} />} />
      <Route path=":ma" element={<TrangMotLop dsLop={ds} onHetPhien={hetPhien} onDangXuat={xuat} />} />
      <Route path="*" element={<Navigate to="/lop-truong" replace />} />
    </Routes>
  )
}
