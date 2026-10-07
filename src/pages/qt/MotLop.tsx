/**
 * Quản trị một lớp: dựng nội dung cho lớp (làm hộ). Chia tab:
 * Tổng quan · Thành viên & sơ đồ · Ảnh · Buổi họp · Tái hiện & thầy cô · Cài đặt.
 * Hạn dùng, ẩn, xóa lớp nằm ở danh sách lớp (quản trị chung).
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom'
import {
  layLop, capNhatLop, datMatKhau, taoMatKhauLop, dsThanhVien, dsChuong, demAnhChoDuyet,
  type LopQuanTri, type ThanhVienQT, type ChuongQT,
} from '../../lib/quanTri'
import type { CapHoc } from '../../lib/guiAnh'
import type { MaGiaoDien } from '../../themes'
import { BAT_HOP_THU } from '../../data/tinhNang'
import { QuanLyThanhVien, SuaSoDo, QuanLyAnh, QuanLyChuong, QuanLyThu, NutNapDemo, NutXoaDemo, BAT_DEMO } from '../QuanTriLop'
import { QuanLyTaiHien, QuanLyThayCo } from '../QuanTriThem'
import {
  ChonCapHoc, ChonGiaoDien, MaQR, SaoChep, QuanLyLopTruong, SuaTenGoi, NhanHan, NhanTrangThai, linkLop,
} from './chung'

interface NgCanh {
  lop: LopQuanTri
  setLop: (l: LopQuanTri) => void
  thanhVien: ThanhVienQT[]
  setThanhVien: (d: ThanhVienQT[]) => void
  chuong: ChuongQT[]
  setChuong: (d: ChuongQT[]) => void
  soCho: number
  taiLaiSoCho: () => void
}

const TAB: { duong: string; ten: string }[] = [
  { duong: 'tong-quan', ten: 'Tổng quan' },
  { duong: 'thanh-vien', ten: 'Thành viên & sơ đồ' },
  { duong: 'anh', ten: 'Ảnh' },
  { duong: 'buoi-hop', ten: 'Buổi họp' },
  { duong: 'tai-hien', ten: BAT_HOP_THU ? 'Tái hiện, thầy cô, thư' : 'Tái hiện & thầy cô' },
  { duong: 'cai-dat', ten: 'Cài đặt' },
]

/* ---------------- Tổng quan ---------------- */
function TongQuan({ nc }: { nc: NgCanh }) {
  const { lop, thanhVien, chuong, soCho } = nc
  const url = linkLop(lop.ma)
  const duAnh = thanhVien.filter((t) => t.anh_xua_id && t.anh_nay_id).length
  const viec: { xong: boolean; chu: string; toi: string }[] = [
    { xong: thanhVien.length > 0, chu: thanhVien.length ? `${thanhVien.length} thành viên` : 'Chưa nhập thành viên', toi: 'thanh-vien' },
    { xong: thanhVien.length > 0 && duAnh === thanhVien.length, chu: `${duAnh}/${thanhVien.length} bạn đủ ảnh ngày ấy – bây giờ`, toi: 'thanh-vien' },
    { xong: !!lop.anh_bia_id, chu: lop.anh_bia_id ? 'Đã có ảnh bìa' : 'Chưa có ảnh bìa (chọn ở tab Ảnh)', toi: 'anh' },
    { xong: soCho === 0, chu: soCho ? `${soCho} ảnh đang chờ duyệt` : 'Không có ảnh chờ duyệt', toi: 'anh' },
    { xong: chuong.length > 0, chu: chuong.length ? `${chuong.length} buổi họp` : 'Chưa có buổi họp nào', toi: 'buoi-hop' },
  ]
  const tinNhan = `Trang kỷ niệm lớp ${lop.ten_lop} · ${lop.truong}\nLink cho cả lớp (bấm là vào, không cần mật khẩu): ${url}`
  return (
    <div className="qt-luoi-the">
      <section className="qt-the-trang" aria-labelledby="h-tien-do">
        <h2 id="h-tien-do">Tiến độ dựng trang</h2>
        <ul className="qt-ds-viec">
          {viec.map((v, i) => (
            <li key={i} className={v.xong ? 'xong' : ''}>
              <span className="qt-dau-viec" aria-hidden="true">
                {v.xong
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L19 7" /></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="7" /></svg>}
              </span>
              <span className="qt-an-di">{v.xong ? 'Xong: ' : 'Chưa xong: '}</span>
              <Link to={`../${v.toi}`}>{v.chu}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="qt-the-trang" aria-labelledby="h-link">
        <h2 id="h-link">Link và mã QR vào lớp</h2>
        <p className="qt-nho" style={{ wordBreak: 'break-all', margin: '0 0 8px' }}><a href={url} target="_blank" rel="noreferrer">{url}</a></p>
        <div className="qt-hang">
          <SaoChep text={url} nhan="Chép link" />
          <SaoChep text={tinNhan} nhan="Chép tin nhắn gửi nhóm Zalo" />
        </div>
        <MaQR url={url} tenFile={`qr-lop-${lop.ma}.png`} />
      </section>

      <section className="qt-the-trang qt-ca-hang">
        <QuanLyLopTruong lop={lop} />
      </section>
    </div>
  )
}

/* ---------------- Cài đặt ---------------- */
function SuaThongTin({ nc }: { nc: NgCanh }) {
  const { lop, setLop } = nc
  const [f, setF] = useState({
    ten_lop: lop.ten_lop, truong: lop.truong, tinh: lop.tinh ?? '',
    bd: lop.nien_khoa_bat_dau ? String(lop.nien_khoa_bat_dau) : '', kt: lop.nien_khoa_ket_thuc ? String(lop.nien_khoa_ket_thuc) : '',
    ghi_chu: lop.ghi_chu_noi_bo ?? '',
  })
  const [dang, setDang] = useState(false)
  const [tb, setTb] = useState<{ ok: boolean; chu: string } | null>(null)
  const doi = (k: keyof typeof f, so = false) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: so ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value })
  const luu = async (e: FormEvent) => {
    e.preventDefault(); setTb(null); setDang(true)
    const moi = {
      ten_lop: f.ten_lop.trim(), truong: f.truong.trim(), tinh: f.tinh.trim() || null,
      nien_khoa_bat_dau: f.bd ? Number(f.bd) : null, nien_khoa_ket_thuc: f.kt ? Number(f.kt) : null,
      ghi_chu_noi_bo: f.ghi_chu.trim() || null,
    }
    try { await capNhatLop(lop.id, moi); setLop({ ...lop, ...moi }); setTb({ ok: true, chu: 'Đã lưu thông tin lớp.' }) }
    catch (er) { setTb({ ok: false, chu: (er as Error).message }) } finally { setDang(false) }
  }
  return (
    <section className="qt-muc" aria-labelledby="h-thong-tin">
      <h2 id="h-thong-tin">Thông tin lớp</h2>
      <form className="qt-form" onSubmit={luu}>
        <div className="qt-hai-cot">
          <div><label htmlFor="cd-ten">Tên lớp</label><input id="cd-ten" required value={f.ten_lop} onChange={doi('ten_lop')} /></div>
          <div><label htmlFor="cd-tinh">Tỉnh / thành</label><input id="cd-tinh" value={f.tinh} onChange={doi('tinh')} /></div>
        </div>
        <label htmlFor="cd-truong">Trường</label><input id="cd-truong" required value={f.truong} onChange={doi('truong')} />
        <div className="qt-hai-cot">
          <div><label htmlFor="cd-bd">Năm vào trường</label><input id="cd-bd" inputMode="numeric" value={f.bd} onChange={doi('bd', true)} /></div>
          <div><label htmlFor="cd-kt">Năm ra trường</label><input id="cd-kt" inputMode="numeric" value={f.kt} onChange={doi('kt', true)} /></div>
        </div>
        <label htmlFor="cd-ghi-chu">Ghi chú nội bộ (chỉ bạn thấy)</label>
        <textarea id="cd-ghi-chu" rows={3} className="qt-o-van" value={f.ghi_chu} onChange={doi('ghi_chu')} placeholder="Vd: đã cọc 500k ngày 10/10, liên hệ chính là bạn Lan" />
        <div className="qt-hang"><button className="qt-nut chinh" disabled={dang}>{dang ? 'Đang lưu…' : 'Lưu thông tin'}</button></div>
        {tb && <p className={tb.ok ? 'qt-ok' : 'qt-loi'} role={tb.ok ? 'status' : 'alert'}>{tb.chu}</p>}
      </form>
    </section>
  )
}

function CaiDat({ nc }: { nc: NgCanh }) {
  const { lop, setLop } = nc
  const [matKhauMoi, setMatKhauMoi] = useState('')
  const [tb, setTb] = useState('')
  const bao = (s: string) => { setTb(s); setTimeout(() => setTb(''), 4000) }
  return (
    <div>
      <SuaThongTin nc={nc} />

      <section className="qt-muc">
        <ChonCapHoc value={lop.cap ?? 'thpt'} onChange={async (c: CapHoc) => {
          await capNhatLop(lop.id, { cap: c }); setLop({ ...lop, cap: c })
          bao('Đã đổi cấp học. Ảnh ở mục không còn trong cấp mới vẫn hiện, xếp lại được ở tab Ảnh.')
        }} />
      </section>

      <section className="qt-muc">
        <ChonGiaoDien value={lop.giao_dien} onChange={async (gd: MaGiaoDien) => {
          await capNhatLop(lop.id, { giao_dien: gd }); setLop({ ...lop, giao_dien: gd }); bao('Đã đổi giao diện.')
        }} />
        <p className="qt-nho" style={{ margin: '4px 0 0' }}><a href={linkLop(lop.ma)} target="_blank" rel="noreferrer">Mở trang lớp để xem</a></p>
      </section>
      {tb && <p className="qt-ok qt-noi" role="status">{tb}</p>}

      <SuaTenGoi lop={lop} onDoi={(t) => setLop({ ...lop, ten_goi: t })} />

      <section className="qt-muc" aria-labelledby="h-mk">
        <h2 id="h-mk">Mật khẩu lớp</h2>
        <p className="qt-mo qt-nho" style={{ marginTop: 0 }}>
          Vào bằng mã lớp (<code>{lop.ma}</code>, link hoặc QR) thì không cần mật khẩu. Mật khẩu chỉ hỏi khi vào bằng tên gọi{lop.ten_goi ? <> (<code>{lop.ten_goi}</code>)</> : ''}, hoặc khi bật công tắc dưới đây.
        </p>
        <label className="qt-chon" htmlFor="luon-can-mk">
          <input id="luon-can-mk" type="checkbox" checked={!!lop.luon_can_mat_khau} onChange={async (e) => {
            const bat = e.target.checked
            await capNhatLop(lop.id, { luon_can_mat_khau: bat }); setLop({ ...lop, luon_can_mat_khau: bat })
          }} />
          Luôn cần mật khẩu (dùng khi link lớp bị lộ ra ngoài)
        </label>
        {matKhauMoi ? (
          <p>Mật khẩu mới: <code>{matKhauMoi}</code> <SaoChep text={matKhauMoi} nhan="Chép" /></p>
        ) : (
          <button className="qt-nut" style={{ marginTop: 8 }} onClick={async () => { const mk = taoMatKhauLop(); await datMatKhau(lop.id, mk); setMatKhauMoi(mk) }}>
            Đặt lại mật khẩu lớp
          </button>
        )}
      </section>

      <section className="qt-muc">
        <h2>Dữ liệu demo</h2>
        {BAT_DEMO && <NutNapDemo lops={[lop]} nhan="Nạp ảnh demo cho lớp này" />}
        <NutXoaDemo lop={lop} />
      </section>

      <p className="qt-mo qt-nho qt-muc">Hạn dùng, ẩn lớp và xóa hẳn lớp: ở <Link to="/quan-tri">danh sách lớp</Link>, nút “Hạn &amp; trạng thái”.</p>
    </div>
  )
}

/* ---------------- Khung một lớp ---------------- */
export default function MotLop() {
  const { id = '' } = useParams()
  const [lop, setLop] = useState<LopQuanTri | null | undefined>(undefined)
  const [thanhVien, setThanhVien] = useState<ThanhVienQT[]>([])
  const [chuong, setChuong] = useState<ChuongQT[]>([])
  const [soCho, setSoCho] = useState(0)

  const taiLaiSoCho = useCallback(() => { demAnhChoDuyet(id).then(setSoCho).catch(() => {}) }, [id])
  useEffect(() => {
    setLop(undefined)
    layLop(id).then(setLop).catch(() => setLop(null))
    dsThanhVien(id).then(setThanhVien).catch(() => {})
    dsChuong(id).then(setChuong).catch(() => {})
    taiLaiSoCho()
  }, [id, taiLaiSoCho])
  useEffect(() => { if (lop) document.title = `Lớp ${lop.ten_lop} · Quản trị` }, [lop])

  if (lop === undefined) return <main className="qt-khung">Đang tải…</main>
  if (lop === null) return (
    <main className="qt-khung">
      <p>Không tìm thấy lớp này (có thể đã bị xóa).</p>
      <Link to="/quan-tri" className="qt-nut">Về danh sách lớp</Link>
    </main>
  )

  const nc: NgCanh = { lop, setLop, thanhVien, setThanhVien, chuong, setChuong, soCho, taiLaiSoCho }
  return (
    <div>
      <header className="qt-dau-lop">
        <div className="qt-khung qt-dau-lop-trong">
          <nav className="qt-vet" aria-label="Vị trí"><Link to="/quan-tri">Các lớp</Link><span aria-hidden="true">/</span><span>Lớp {lop.ten_lop}</span></nav>
          <div className="qt-dau-lop-hang">
            <div>
              <h1>Lớp {lop.ten_lop} · {lop.truong}</h1>
              <p className="qt-mo qt-nho">
                {[lop.nien_khoa_bat_dau && lop.nien_khoa_ket_thuc ? `${lop.nien_khoa_bat_dau}–${lop.nien_khoa_ket_thuc}` : null, lop.tinh].filter(Boolean).join(' · ')}
                {' · mã '}<code>{lop.ma}</code>{' '}<NhanTrangThai tt={lop.trang_thai} /> <NhanHan hetHan={lop.het_han} />
              </p>
            </div>
            <a className="qt-nut nho" href={linkLop(lop.ma)} target="_blank" rel="noreferrer">
              Mở trang lớp
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: 6 }}><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
            </a>
          </div>
          {lop.trang_thai === 'luu-tru' && <p className="qt-canh-bao" style={{ margin: '8px 0 0' }}>Lớp đang ẩn: trang lớp báo không tìm thấy. Hiện lại ở danh sách lớp.</p>}
        </div>
        <nav className="qt-tab-lop" aria-label="Mục quản trị lớp">
          <div className="qt-khung qt-tab-lop-trong">
            {TAB.map((t) => (
              <NavLink key={t.duong} to={t.duong} className={({ isActive }) => `qt-tab ${isActive ? 'dang' : ''}`}>
                {t.ten}{t.duong === 'anh' && soCho > 0 && <span className="qt-dem">{soCho}<span className="qt-an-di"> ảnh chờ duyệt</span></span>}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="qt-khung qt-than-lop">
        <Routes>
          <Route index element={<Navigate to="tong-quan" replace />} />
          <Route path="tong-quan" element={<TongQuan nc={nc} />} />
          <Route path="thanh-vien" element={<>
            <QuanLyThanhVien lopId={lop.id} lopMa={lop.ma} onDoi={setThanhVien} />
            <SuaSoDo lopId={lop.id} thanhVien={thanhVien} />
          </>} />
          <Route path="anh" element={<QuanLyAnh lopId={lop.id} maLop={lop.ma} thanhVien={thanhVien} chuong={chuong} cap={lop.cap} onDoi={taiLaiSoCho} />} />
          <Route path="buoi-hop" element={<QuanLyChuong lopId={lop.id} maLop={lop.ma} tenLop={lop.ten_lop} truong={lop.truong} onDoi={setChuong} />} />
          <Route path="tai-hien" element={<>
            <QuanLyTaiHien lopId={lop.id} lopMa={lop.ma} />
            <QuanLyThayCo lopId={lop.id} lopMa={lop.ma} />
            {BAT_HOP_THU && <QuanLyThu lopId={lop.id} chuong={chuong} />}
          </>} />
          <Route path="cai-dat" element={<CaiDat nc={nc} />} />
          <Route path="*" element={<Navigate to="tong-quan" replace />} />
        </Routes>
      </main>
    </div>
  )
}
