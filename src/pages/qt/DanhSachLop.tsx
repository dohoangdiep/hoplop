/**
 * Quản trị chung: tất cả các lớp. Tìm, lọc, tạo lớp, đặt hạn dùng, đổi trạng thái, ẩn, xóa hẳn.
 * Nội dung bên trong từng lớp (thành viên, ảnh, buổi họp…) nằm ở trang quản trị một lớp.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  danhSachLop, locLop, capNhatLop, xoaLop, donFileChoXoa, homNay, congThang, tinhTrangHan,
  type LopDanhSach,
} from '../../lib/quanTri'
import { hienSdt } from '../../lib/lopTruong'
import { NhanHan, NhanTrangThai, NutZalo, TRANG_THAI, ngayVN } from './chung'
import { NutNapDemo, BAT_DEMO } from '../QuanTriLop'

type Loc = 'hoat-dong' | 'cho-duyet' | 'sap-het' | 'het-han' | 'da-an' | 'tat-ca'
type SapXep = 'moi' | 'han' | 'ten' | 'cho-duyet'

const daAn = (l: LopDanhSach) => l.trang_thai === 'luu-tru'
const KIEM_LOC: Record<Loc, (l: LopDanhSach) => boolean> = {
  'hoat-dong': (l) => !daAn(l),
  'cho-duyet': (l) => !daAn(l) && l.so_cho_duyet > 0,
  'sap-het': (l) => !daAn(l) && tinhTrangHan(l.het_han) === 'sap-het',
  'het-han': (l) => !daAn(l) && tinhTrangHan(l.het_han) === 'het-han',
  'da-an': daAn,
  'tat-ca': () => true,
}
const O_SO: { ma: Loc; ten: string; mau?: string }[] = [
  { ma: 'hoat-dong', ten: 'Đang hoạt động' },
  { ma: 'cho-duyet', ten: 'Có ảnh chờ duyệt', mau: 'tim' },
  { ma: 'sap-het', ten: 'Sắp hết hạn (30 ngày)', mau: 'vang' },
  { ma: 'het-han', ten: 'Đã hết hạn', mau: 'do' },
  { ma: 'da-an', ten: 'Đã ẩn', mau: 'xam' },
]

function sapXep(ds: LopDanhSach[], k: SapXep) {
  const kq = [...ds]
  if (k === 'han') kq.sort((a, b) => (a.het_han ?? '9999').localeCompare(b.het_han ?? '9999'))
  else if (k === 'ten') kq.sort((a, b) => `${a.ten_lop} ${a.truong}`.localeCompare(`${b.ten_lop} ${b.truong}`, 'vi', { numeric: true }))
  else if (k === 'cho-duyet') kq.sort((a, b) => b.so_cho_duyet - a.so_cho_duyet)
  else kq.sort((a, b) => b.tao_luc.localeCompare(a.tao_luc))
  return kq
}

/* ---------------- Bảng thao tác của một lớp: hạn dùng, trạng thái, ẩn, xóa ---------------- */
function ThaoTacLop({ lop, onDoi, onXoa }: { lop: LopDanhSach; onDoi: (l: LopDanhSach) => void; onXoa: () => void }) {
  const [han, setHan] = useState(lop.het_han?.slice(0, 10) ?? '')
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState('')
  const [ok, setOk] = useState('')
  const [moXoa, setMoXoa] = useState(false)
  const [goMa, setGoMa] = useState('')
  const [tienDo, setTienDo] = useState('')

  const lam = async (viec: () => Promise<void>, tb: string) => {
    setLoi(''); setOk(''); setDang(true)
    try { await viec(); setOk(tb) } catch (e) { setLoi((e as Error).message) } finally { setDang(false) }
  }
  // Gia hạn tính từ hạn hiện tại, hoặc từ hôm nay nếu đã quá hạn / chưa có hạn
  const goc = lop.het_han && lop.het_han.slice(0, 10) > homNay() ? lop.het_han.slice(0, 10) : homNay()
  const datHan = (moi: string | null) => lam(async () => {
    await capNhatLop(lop.id, { het_han: moi })
    // Đang "chỉ xem" vì hết hạn mà gia hạn thì mở lại
    const tt = moi && moi > homNay() && lop.trang_thai === 'chi-xem' ? 'da-ban-giao' : lop.trang_thai
    if (tt !== lop.trang_thai) await capNhatLop(lop.id, { trang_thai: tt })
    setHan(moi ?? ''); onDoi({ ...lop, het_han: moi, trang_thai: tt })
  }, moi ? `Đã đặt hạn dùng đến ${ngayVN(moi)}.` : 'Đã bỏ hạn dùng.')

  const id = (k: string) => `${k}-${lop.id}`
  return (
    <div className="qt-thao-tac">
      <section aria-labelledby={id('h-han')}>
        <h3 id={id('h-han')}>Hạn dùng</h3>
        <p className="qt-mo qt-nho">Hiện tại: <NhanHan hetHan={lop.het_han} dai /></p>
        <div className="qt-hang">
          <button type="button" className="qt-nut nho chinh" disabled={dang} onClick={() => datHan(congThang(goc, 12))}>Gia hạn 1 năm</button>
          <button type="button" className="qt-nut nho" disabled={dang} onClick={() => datHan(congThang(goc, 6))}>+ 6 tháng</button>
        </div>
        <form className="qt-hang qt-hang-form" onSubmit={(e: FormEvent) => { e.preventDefault(); if (han) datHan(han) }}>
          <label htmlFor={id('han')} className="qt-nho">Hoặc chọn ngày</label>
          <input id={id('han')} type="date" value={han} onChange={(e) => setHan(e.target.value)} />
          <button className="qt-nut nho" disabled={dang || !han}>Lưu ngày</button>
          {lop.het_han && <button type="button" className="qt-link qt-nho" disabled={dang} onClick={() => datHan(null)}>Bỏ hạn</button>}
        </form>
      </section>

      <section aria-labelledby={id('h-tt')}>
        <h3 id={id('h-tt')}>Trạng thái</h3>
        {daAn(lop) ? (
          <>
            <p className="qt-mo qt-nho">Lớp đang ẩn: trang lớp, trang gửi ảnh và mã QR đều báo không tìm thấy. Dữ liệu vẫn giữ nguyên.</p>
            <button type="button" className="qt-nut nho chinh" disabled={dang}
              onClick={() => lam(async () => { await capNhatLop(lop.id, { trang_thai: 'da-ban-giao' }); onDoi({ ...lop, trang_thai: 'da-ban-giao' }) }, 'Đã hiện lại lớp (trạng thái: Đã bàn giao).')}>
              Hiện lại lớp
            </button>
          </>
        ) : (
          <>
            <label htmlFor={id('tt')} className="qt-an-di">Trạng thái lớp</label>
            <select id={id('tt')} value={lop.trang_thai} disabled={dang}
              onChange={(e) => { const tt = e.target.value; lam(async () => { await capNhatLop(lop.id, { trang_thai: tt }); onDoi({ ...lop, trang_thai: tt }) }, 'Đã đổi trạng thái.') }}>
              {Object.entries(TRANG_THAI).filter(([k]) => k !== 'luu-tru').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <p className="qt-mo qt-nho">“Chỉ xem”: cả lớp vẫn xem được nhưng không gửi ảnh được nữa.</p>
            <button type="button" className="qt-nut nho" disabled={dang} onClick={() => {
              if (window.confirm(`Ẩn lớp ${lop.ten_lop} · ${lop.truong}? Trang lớp sẽ báo không tìm thấy cho tới khi bạn hiện lại. Dữ liệu vẫn giữ nguyên.`))
                lam(async () => { await capNhatLop(lop.id, { trang_thai: 'luu-tru' }); onDoi({ ...lop, trang_thai: 'luu-tru' }) }, 'Đã ẩn lớp.')
            }}>Ẩn lớp</button>
          </>
        )}
      </section>

      <section aria-labelledby={id('h-xoa')} className="qt-vung-nguy">
        <h3 id={id('h-xoa')}>Xóa hẳn</h3>
        {!moXoa ? (
          <>
            <p className="qt-mo qt-nho">Xóa vĩnh viễn lớp cùng toàn bộ ảnh, thành viên, buổi họp. Không lấy lại được. Muốn tạm cất đi thì dùng “Ẩn lớp”.</p>
            <button type="button" className="qt-nut nho nguy" onClick={() => setMoXoa(true)}>Xóa hẳn lớp này…</button>
          </>
        ) : (
          <form className="qt-form" onSubmit={async (e: FormEvent) => {
            e.preventDefault()
            if (goMa.trim().toLowerCase() !== lop.ma) return
            setLoi(''); setDang(true)
            try { await xoaLop(lop.id, setTienDo); onXoa() } catch (er) { setLoi((er as Error).message); setDang(false) }
          }}>
            <label htmlFor={id('go-ma')} className="qt-nho">Gõ mã lớp <code>{lop.ma}</code> để xác nhận xóa vĩnh viễn</label>
            <input id={id('go-ma')} value={goMa} onChange={(e) => setGoMa(e.target.value)} autoCapitalize="none" autoComplete="off" />
            <div className="qt-hang">
              <button className="qt-nut nho nguy-dac" disabled={dang || goMa.trim().toLowerCase() !== lop.ma}>{dang ? 'Đang xóa…' : 'Xóa vĩnh viễn'}</button>
              <button type="button" className="qt-nut nho" disabled={dang} onClick={() => { setMoXoa(false); setGoMa('') }}>Thôi</button>
            </div>
            {tienDo && <p className="qt-mo qt-nho" role="status">{tienDo}</p>}
          </form>
        )}
      </section>

      {ok && <p className="qt-ok" role="status">{ok}</p>}
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </div>
  )
}

/* ---------------- Một dòng lớp ---------------- */
function DongLop({ lop, mo, onMo, onDoi, onXoa }: {
  lop: LopDanhSach; mo: boolean; onMo: () => void; onDoi: (l: LopDanhSach) => void; onXoa: () => void
}) {
  return (
    <li className={`qt-dong ${daAn(lop) ? 'da-an' : ''} ${mo ? 'dang-mo' : ''}`}>
      <div className="qt-dong-chinh">
        <div className="qt-cot-lop">
          <Link to={`/quan-tri/lop/${lop.id}`} className="qt-ten-lop">Lớp {lop.ten_lop} · {lop.truong}</Link>
          <span className="qt-mo qt-nho">
            {[lop.nien_khoa_bat_dau && lop.nien_khoa_ket_thuc ? `${lop.nien_khoa_bat_dau}–${lop.nien_khoa_ket_thuc}` : null, lop.tinh].filter(Boolean).join(' · ')}
            {' · mã '}<code>{lop.ma}</code>
          </span>
          {lop.so_cho_duyet > 0 && (
            <Link to={`/quan-tri/lop/${lop.id}/anh`} className="qt-huy-hieu">{lop.so_cho_duyet} ảnh chờ duyệt</Link>
          )}
        </div>
        <div className="qt-cot-lt">
          {lop.lop_truong.length ? lop.lop_truong.map((t) => (
            <div key={t.id} className="qt-lt-dong">
              <span>{t.ho_ten}<br /><span className="qt-mo qt-nho">{hienSdt(t.sdt)}</span></span>
              <NutZalo lt={t} />
            </div>
          )) : <span className="qt-mo qt-nho">Chưa có lớp trưởng</span>}
        </div>
        <div className="qt-cot-han">
          <NhanTrangThai tt={lop.trang_thai} />
          <NhanHan hetHan={lop.het_han} />
        </div>
        <div className="qt-cot-nut">
          <Link to={`/quan-tri/lop/${lop.id}`} className="qt-nut nho chinh">Quản lý</Link>
          <button type="button" className={`qt-nut nho ${mo ? 'chon' : ''}`} aria-expanded={mo} onClick={onMo}>Hạn &amp; trạng thái</button>
        </div>
      </div>
      {mo && <ThaoTacLop lop={lop} onDoi={onDoi} onXoa={onXoa} />}
    </li>
  )
}

export default function DanhSachLop() {
  const [ds, setDs] = useState<LopDanhSach[] | null>(null)
  const [loi, setLoi] = useState('')
  const [tim, setTim] = useState('')
  const [loc, setLoc] = useState<Loc>('hoat-dong')
  const [xep, setXep] = useState<SapXep>('moi')
  const [mo, setMo] = useState<string | null>(null)
  const [thongBao, setThongBao] = useState('')

  useEffect(() => {
    danhSachLop().then(setDs).catch((e) => setLoi(e.message))
    donFileChoXoa().catch(() => { /* lần sau dọn tiếp */ })
  }, [])

  const dem = useMemo(() => Object.fromEntries(O_SO.map((o) => [o.ma, (ds ?? []).filter(KIEM_LOC[o.ma]).length])) as Record<Loc, number>, [ds])
  // Đang tìm thì tìm trong mọi lớp (kể cả đã ẩn), để tra SĐT lớp trưởng không bị sót
  const hien = useMemo(() => {
    if (!ds) return []
    const nguon = tim.trim() ? locLop(ds, tim) : ds.filter(KIEM_LOC[loc])
    return sapXep(nguon, xep)
  }, [ds, tim, loc, xep])
  const tongCho = (ds ?? []).reduce((n, l) => n + (daAn(l) ? 0 : l.so_cho_duyet), 0)

  return (
    <main className="qt-khung">
      <div className="qt-tieu-de">
        <div>
          <h1 style={{ marginBottom: 2 }}>Các lớp</h1>
          <p className="qt-mo qt-nho" style={{ margin: 0 }}>
            {ds ? `${ds.length} lớp${tongCho ? ` · ${tongCho} ảnh đang chờ duyệt` : ''}` : ' '}
          </p>
        </div>
        <Link className="qt-nut chinh" to="/quan-tri/tao-lop">Tạo lớp mới</Link>
      </div>
      {loi && <p className="qt-loi" role="alert">{loi}</p>}

      {ds === null ? (!loi && <p>Đang tải…</p>) : ds.length === 0 ? (
        <div className="qt-trong">
          <p>Chưa có lớp nào.</p>
          <Link className="qt-nut chinh" to="/quan-tri/tao-lop">Tạo lớp đầu tiên</Link>
        </div>
      ) : (
        <>
          <div className="qt-o-so" role="group" aria-label="Lọc lớp">
            {O_SO.map((o) => (
              <button key={o.ma} type="button" className={`qt-o-so-nut ${o.mau ?? ''}`} aria-pressed={!tim.trim() && loc === o.ma}
                onClick={() => { setLoc(o.ma); setTim(''); setMo(null) }}>
                <b>{dem[o.ma]}</b><span>{o.ten}</span>
              </button>
            ))}
          </div>

          <div className="qt-thanh-tim">
            <div className="qt-o-tim">
              <label htmlFor="tim-lop" className="qt-an-di">Tìm lớp</label>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input id="tim-lop" type="search" value={tim} onChange={(e) => setTim(e.target.value)}
                placeholder="Tìm theo SĐT lớp trưởng (vài số cuối cũng được), mã lớp, tên lớp, trường…" autoComplete="off" />
            </div>
            <label htmlFor="sap-xep" className="qt-an-di">Sắp xếp</label>
            <select id="sap-xep" value={xep} onChange={(e) => setXep(e.target.value as SapXep)}>
              <option value="moi">Mới tạo trước</option>
              <option value="han">Hạn dùng gần nhất</option>
              <option value="cho-duyet">Nhiều ảnh chờ duyệt</option>
              <option value="ten">Tên lớp A–Z</option>
            </select>
          </div>
          <p className="qt-mo qt-nho" role="status" style={{ margin: '0 0 8px' }}>
            {tim.trim() ? `${hien.length} lớp khớp “${tim.trim()}” (tìm cả lớp đã ẩn)` : `${hien.length} lớp · ${O_SO.find((o) => o.ma === loc)?.ten ?? 'Tất cả'}`}
            {!tim.trim() && loc !== 'tat-ca' && <> · <button type="button" className="qt-link qt-nho" onClick={() => setLoc('tat-ca')}>Xem tất cả {ds.length} lớp</button></>}
          </p>
          {thongBao && (
            <p className="qt-ok qt-thong-bao" role="status">
              <span>{thongBao}</span>
              <button type="button" className="qt-link qt-nho" onClick={() => setThongBao('')}>Đóng</button>
            </p>
          )}

          {hien.length === 0 ? <p className="qt-mo">Không có lớp nào ở đây.</p> : (
            <>
              <div className="qt-dau-bang" aria-hidden="true">
                <span>Lớp</span><span>Lớp trưởng</span><span>Trạng thái · hạn dùng</span><span />
              </div>
              <ul className="qt-bang">
                {hien.map((l) => (
                  <DongLop key={l.id} lop={l} mo={mo === l.id} onMo={() => setMo(mo === l.id ? null : l.id)}
                    onDoi={(moi) => {
                      // Ẩn / hiện lại làm dòng rời khỏi bộ lọc đang xem: báo ở đầu danh sách thay vì trong dòng
                      if (daAn(moi) !== daAn(l)) {
                        setThongBao(daAn(moi)
                          ? `Đã ẩn lớp ${moi.ten_lop} · ${moi.truong}. Trang lớp báo không tìm thấy cho tới khi bạn hiện lại (ô “Đã ẩn”).`
                          : `Đã hiện lại lớp ${moi.ten_lop} · ${moi.truong} (trạng thái: Đã bàn giao).`)
                        if (!KIEM_LOC[loc](moi) && !tim.trim()) setMo(null)
                      }
                      setDs((d) => d!.map((x) => (x.id === moi.id ? moi : x)))
                    }}
                    onXoa={() => { setDs((d) => d!.filter((x) => x.id !== l.id)); setMo(null); setThongBao(`Đã xóa vĩnh viễn lớp ${l.ten_lop} · ${l.truong}.`) }} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {BAT_DEMO && ds && ds.length > 0 && (
        <section className="qt-muc">
          <h2>Dữ liệu demo</h2>
          <p className="qt-mo qt-nho" style={{ margin: 0 }}>Vẽ ảnh hoạt hình minh họa (ảnh xưa, chân dung từng bạn, buổi họp lớp) rồi tải lên và duyệt sẵn cho tất cả lớp đang hoạt động.</p>
          <NutNapDemo lops={ds.filter((l) => !daAn(l))} nhan={`Nạp ảnh demo cho ${ds.filter((l) => !daAn(l)).length} lớp`} />
        </section>
      )}
    </main>
  )
}
