import { useEffect, useMemo, useState } from 'react'
import {
  dsThanhVien, phanTichDanhSach, themThanhVien, suaThanhVien, xoaThanhVien,
  laySoDo, luuSoDo, khoaCho, type ThanhVienQT, type SoDoQT,
  dsAnh, capNhatAnh, capNhatNhieuAnh, ganAnhChoBan, datAnhBia, type AnhQT, type LopQuanTri,
} from '../lib/quanTri'
import { linkXemNhieu, linkTaiGoc } from '../lib/storage'
import { MUC_ANH, TEN_MUC } from '../lib/guiAnh'

/* ---------------- Thành viên ---------------- */
export function QuanLyThanhVien({ lopId, onDoi }: { lopId: string; onDoi: (ds: ThanhVienQT[]) => void }) {
  const [ds, setDs] = useState<ThanhVienQT[]>([])
  const [van, setVan] = useState('')
  const [dangSua, setDangSua] = useState<string | null>(null)
  const [loi, setLoi] = useState('')

  const tai = async () => {
    const d = await dsThanhVien(lopId)
    setDs(d); onDoi(d)
  }
  useEffect(() => { tai().catch((e) => setLoi(e.message)) }, [lopId]) // eslint-disable-line react-hooks/exhaustive-deps

  const xemTruoc = useMemo(() => phanTichDanhSach(van), [van])

  const them = async () => {
    setLoi('')
    try { await themThanhVien(lopId, xemTruoc, ds.length); setVan(''); await tai() }
    catch (e) { setLoi((e as Error).message) }
  }

  return (
    <section className="qt-muc">
      <h2>Thành viên ({ds.length})</h2>

      <label htmlFor="dan-ds" className="qt-nhan">Dán danh sách lớp, mỗi dòng một bạn</label>
      <textarea
        id="dan-ds" rows={6} value={van} onChange={(e) => setVan(e.target.value)}
        placeholder={'Nguyễn Văn Hùng | Hùng Còi | Đà Nẵng | Ai đi xa nhất thì phải về sớm nhất!\nPhạm Thị Lan | Lan Béo\nLê Anh Tuấn'}
        className="qt-o-van"
      />
      <p className="qt-mo" style={{ fontSize: 13, margin: '4px 0' }}>
        Dạng: <code>Họ tên | biệt danh | nơi ở | câu lưu bút</code>. Chỉ cần họ tên, các phần sau có thể bỏ trống. Có thể dán thẳng từ Excel hoặc Zalo.
      </p>
      {xemTruoc.length > 0 && (
        <button className="qt-nut chinh" onClick={them}>Thêm {xemTruoc.length} bạn</button>
      )}

      {ds.length > 0 && (
        <ul className="qt-ds-tv">
          {ds.map((t) => dangSua === t.id ? (
            <SuaMotBan key={t.id} tv={t} onXong={async () => { setDangSua(null); await tai() }} />
          ) : (
            <li key={t.id}>
              <div>
                <strong>{t.ho_ten}</strong>
                <span>
                  {[t.biet_danh && `“${t.biet_danh}”`, t.noi_o, t.an_thong_tin && 'ẩn nơi ở'].filter(Boolean).join(' · ') || 'Chưa có biệt danh'}
                </span>
              </div>
              <button className="qt-nut nho" onClick={() => setDangSua(t.id)}>Sửa</button>
            </li>
          ))}
        </ul>
      )}
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </section>
  )
}

function SuaMotBan({ tv, onXong }: { tv: ThanhVienQT; onXong: () => void }) {
  const [f, setF] = useState(tv)
  const doi = (k: keyof ThanhVienQT) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const luu = async () => {
    await suaThanhVien(tv.id, {
      ho_ten: f.ho_ten, ten_goi_tat: f.ten_goi_tat || null, biet_danh: f.biet_danh || null,
      noi_o: f.noi_o || null, cau_luu_but: f.cau_luu_but || null, an_thong_tin: f.an_thong_tin,
    })
    onXong()
  }
  const xoa = async () => {
    if (window.confirm(`Xóa ${tv.ho_ten} khỏi lớp?`)) { await xoaThanhVien(tv.id); onXong() }
  }
  const id = (s: string) => `${s}-${tv.id}`
  return (
    <li className="qt-sua-tv">
      <label htmlFor={id('ht')}>Họ tên</label><input id={id('ht')} value={f.ho_ten} onChange={doi('ho_ten')} />
      <label htmlFor={id('gt')}>Tên ngắn trên sơ đồ</label><input id={id('gt')} value={f.ten_goi_tat ?? ''} onChange={doi('ten_goi_tat')} />
      <label htmlFor={id('bd')}>Biệt danh</label><input id={id('bd')} value={f.biet_danh ?? ''} onChange={doi('biet_danh')} />
      <label htmlFor={id('no')}>Nơi ở</label><input id={id('no')} value={f.noi_o ?? ''} onChange={doi('noi_o')} />
      <label htmlFor={id('lb')}>Câu lưu bút</label><input id={id('lb')} value={f.cau_luu_but ?? ''} onChange={doi('cau_luu_but')} />
      <label className="qt-chon"><input type="checkbox" checked={f.an_thong_tin} onChange={doi('an_thong_tin')} /> Ẩn nơi ở của bạn này</label>
      <div className="qt-hang">
        <button className="qt-nut chinh" onClick={luu}>Lưu</button>
        <button className="qt-nut" onClick={onXong}>Hủy</button>
        <button className="qt-nut nguy" onClick={xoa}>Xóa</button>
      </div>
    </li>
  )
}

/* ---------------- Sơ đồ chỗ ngồi ---------------- */
export function SuaSoDo({ lopId, thanhVien }: { lopId: string; thanhVien: ThanhVienQT[] }) {
  const [sd, setSd] = useState<SoDoQT | null>(null)
  const [dangChon, setDangChon] = useState<string | null>(null)
  const [thongBao, setThongBao] = useState('')
  const [loi, setLoi] = useState('')

  useEffect(() => { laySoDo(lopId).then(setSd).catch((e) => setLoi(e.message)) }, [lopId])

  const tvTheoId = useMemo(() => new Map(thanhVien.map((t) => [t.id, t])), [thanhVien])
  if (!sd) return <section className="qt-muc"><h2>Sơ đồ chỗ ngồi</h2><p>Đang tải…</p></section>

  // Chỉ tính các chỗ nằm trong lưới hiện tại (khi thu nhỏ sơ đồ, chỗ ngoài lưới coi như bỏ)
  const trongLuoi = (k: string) => {
    const [d, b, v] = k.split('-').map(Number)
    return d < sd.so_day && b < sd.so_ban_moi_day && v < sd.cho_moi_ban
  }
  const daXep = new Set(Object.entries(sd.cho).filter(([k, tv]) => tv && trongLuoi(k)).map(([, tv]) => tv))
  const chuaXep = thanhVien.filter((t) => !daXep.has(t.id))
  const soChoTrong = sd.so_day * sd.so_ban_moi_day * sd.cho_moi_ban - daXep.size
  const thieuCho = chuaXep.length - soChoTrong
  const themDayChoDu = () => {
    const can = Math.ceil((thanhVien.length) / (sd.so_ban_moi_day * sd.cho_moi_ban))
    setSd({ ...sd, so_day: Math.min(12, Math.max(sd.so_day, can)) })
  }

  const datKichThuoc = (k: 'so_day' | 'so_ban_moi_day' | 'cho_moi_ban', v: number) =>
    setSd({ ...sd, [k]: Math.max(1, Math.min(k === 'cho_moi_ban' ? 4 : 12, v || 1)) })

  const ganCho = (khoa: string, tvId: string) => {
    const cho = { ...sd.cho }
    for (const k of Object.keys(cho)) if (cho[k] === tvId) cho[k] = null // một bạn chỉ ngồi một chỗ
    cho[khoa] = tvId || null
    setSd({ ...sd, cho }); setDangChon(null); setThongBao('')
  }

  const xepLanLuot = () => {
    const cho = { ...sd.cho }
    let i = 0
    for (let d = 0; d < sd.so_day; d++) for (let b = 0; b < sd.so_ban_moi_day; b++) for (let v = 0; v < sd.cho_moi_ban; v++) {
      const k = khoaCho(d, b, v)
      if (!cho[k] && i < chuaXep.length) cho[k] = chuaXep[i++].id
    }
    setSd({ ...sd, cho })
  }

  const luu = async () => {
    setLoi('')
    // Bỏ các chỗ ngoài lưới và các bạn đã bị xóa khỏi lớp
    const cho = Object.fromEntries(Object.entries(sd.cho).filter(([k, tv]) => tv && trongLuoi(k) && tvTheoId.has(tv)))
    try { await luuSoDo(lopId, { ...sd, cho }); setSd({ ...sd, cho }); setThongBao('Đã lưu sơ đồ.') } catch (e) { setLoi((e as Error).message) }
  }

  const soCho = sd.so_day * sd.so_ban_moi_day * sd.cho_moi_ban

  return (
    <section className="qt-muc">
      <h2>Sơ đồ chỗ ngồi</h2>
      <div className="qt-ba-cot">
        <div><label htmlFor="sd-day" className="qt-nhan">Số dãy bàn</label>
          <input id="sd-day" type="number" min={1} max={12} value={sd.so_day} onChange={(e) => datKichThuoc('so_day', +e.target.value)} /></div>
        <div><label htmlFor="sd-ban" className="qt-nhan">Bàn mỗi dãy</label>
          <input id="sd-ban" type="number" min={1} max={12} value={sd.so_ban_moi_day} onChange={(e) => datKichThuoc('so_ban_moi_day', +e.target.value)} /></div>
        <div><label htmlFor="sd-cho" className="qt-nhan">Chỗ mỗi bàn</label>
          <input id="sd-cho" type="number" min={1} max={4} value={sd.cho_moi_ban} onChange={(e) => datKichThuoc('cho_moi_ban', +e.target.value)} /></div>
      </div>
      <p className="qt-mo" style={{ fontSize: 13 }}>
        {soCho} chỗ · {thanhVien.length} bạn · còn {chuaXep.length} bạn chưa xếp. Bấm vào một chỗ để chọn bạn ngồi đó.
      </p>
      {thieuCho > 0 && (
        <div className="qt-canh-bao" role="status">
          Thiếu {thieuCho} chỗ. Thêm dãy hoặc thêm bàn cho đủ.
          <button className="qt-nut nho" onClick={themDayChoDu}>Thêm dãy cho đủ chỗ</button>
        </div>
      )}

      <div className="qt-so-do">
        <div className="qt-bang-den">Bảng đen</div>
        {Array.from({ length: sd.so_day }, (_, d) => (
          <div key={d} className="qt-hang-ban" style={{ gridTemplateColumns: `repeat(${sd.so_ban_moi_day}, minmax(0, 1fr))` }}>
            {Array.from({ length: sd.so_ban_moi_day }, (_, b) => (
              <div key={b} className="qt-ban" style={{ gridTemplateColumns: `repeat(${sd.cho_moi_ban}, minmax(0, 1fr))` }}>
                {Array.from({ length: sd.cho_moi_ban }, (_, v) => {
                  const k = khoaCho(d, b, v)
                  const tv = sd.cho[k] ? tvTheoId.get(sd.cho[k]!) : undefined // bạn đã bị xóa thì coi như trống
                  return (
                    <button key={v} type="button" className={`qt-cho ${dangChon === k ? 'dang-chon' : ''} ${tv ? 'co-nguoi' : ''}`}
                      aria-label={tv ? `${tv.ho_ten}, bấm để đổi` : 'Chỗ trống, bấm để xếp'}
                      onClick={() => setDangChon(dangChon === k ? null : k)}>
                      {tv ? (tv.ten_goi_tat || tv.ho_ten.split(' ').pop()) : '+'}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {dangChon && (
        <div className="qt-chon-ban">
          <label htmlFor="chon-ban" className="qt-nhan">Ai ngồi chỗ này?</label>
          <select id="chon-ban" value={sd.cho[dangChon] ?? ''} onChange={(e) => ganCho(dangChon, e.target.value)}>
            <option value="">— Để trống —</option>
            {thanhVien.map((t) => (
              <option key={t.id} value={t.id}>{t.ho_ten}{daXep.has(t.id) && sd.cho[dangChon] !== t.id ? ' (đang ngồi chỗ khác)' : ''}</option>
            ))}
          </select>
        </div>
      )}

      <div className="qt-hang" style={{ marginTop: 12 }}>
        {chuaXep.length > 0 && <button className="qt-nut" onClick={xepLanLuot}>Xếp lần lượt các bạn chưa có chỗ</button>}
        <button className="qt-nut chinh" onClick={luu}>Lưu sơ đồ</button>
      </div>
      {thongBao && <p className="qt-ok" role="status">{thongBao}</p>}
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </section>
  )
}

/* ---------------- Ảnh ---------------- */
const TAB_ANH: { ma: AnhQT['trang_thai']; ten: string }[] = [
  { ma: 'cho-duyet', ten: 'Chờ duyệt' },
  { ma: 'da-duyet', ten: 'Đã duyệt' },
  { ma: 'an', ten: 'Đã ẩn' },
]

export function QuanLyAnh({ lopId, maLop, thanhVien }: { lopId: string; maLop: string; thanhVien: ThanhVienQT[] }) {
  const [ds, setDs] = useState<AnhQT[] | null>(null)
  const [url, setUrl] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<AnhQT['trang_thai']>('cho-duyet')
  const [dangMo, setDangMo] = useState<string | null>(null)
  const [loi, setLoi] = useState('')

  const tai = async () => {
    try {
      const d = await dsAnh(lopId)
      setDs(d)
      setUrl(await linkXemNhieu(d.map((a) => a.duong_dan_xem)))
    } catch (e) { setLoi((e as Error).message) }
  }
  useEffect(() => { tai() }, [lopId]) // eslint-disable-line react-hooks/exhaustive-deps

  const lam = async (viec: () => Promise<void>) => {
    setLoi('')
    try { await viec(); await tai() } catch (e) { setLoi((e as Error).message) }
  }

  if (!ds) return <section className="qt-muc"><h2>Ảnh</h2><p>Đang tải…</p></section>
  const loc = ds.filter((a) => a.trang_thai === tab)
  const dem = (t: AnhQT['trang_thai']) => ds.filter((a) => a.trang_thai === t).length
  const anhMo = dangMo ? ds.find((a) => a.id === dangMo) : undefined

  return (
    <section className="qt-muc">
      <div className="qt-tieu-de">
        <h2>Ảnh</h2>
        <a className="qt-nut nho" href={`/${maLop}/gui-anh`} target="_blank" rel="noreferrer">Tải ảnh lên</a>
      </div>
      <p className="qt-mo" style={{ fontSize: 13, marginTop: 0 }}>Ảnh do quản trị tải lên được duyệt sẵn. Ảnh thành viên gửi nằm ở “Chờ duyệt”.</p>

      <div className="qt-hang" role="group" aria-label="Lọc ảnh">
        {TAB_ANH.map((t) => (
          <button key={t.ma} className={`qt-nut nho ${tab === t.ma ? 'chinh' : ''}`} onClick={() => { setTab(t.ma); setDangMo(null) }}>
            {t.ten} ({dem(t.ma)})
          </button>
        ))}
      </div>

      {tab === 'cho-duyet' && loc.length > 1 && (
        <div className="qt-hang" style={{ marginTop: 10 }}>
          <button className="qt-nut nho chinh" onClick={() => lam(() => capNhatNhieuAnh(loc.map((a) => a.id), { trang_thai: 'da-duyet' }))}>
            Duyệt tất cả {loc.length} ảnh
          </button>
        </div>
      )}

      {loc.length === 0 ? <p className="qt-mo">Không có ảnh nào.</p> : (
        <div className="qt-luoi-anh">
          {loc.map((a) => (
            <button key={a.id} type="button" className={`qt-o-anh ${dangMo === a.id ? 'dang-chon' : ''}`} onClick={() => setDangMo(dangMo === a.id ? null : a.id)}
              aria-label={`Ảnh${a.chu_thich ? ': ' + a.chu_thich : ''}${a.nguoi_gui_ten ? ', ' + a.nguoi_gui_ten + ' gửi' : ''}`}>
              {url[a.duong_dan_xem] ? <img src={url[a.duong_dan_xem]} alt="" loading="lazy" /> : <span>…</span>}
              <small>{a.loai === 'xua' ? TEN_MUC[a.muc ?? 'khac'] : 'Buổi họp'}</small>
            </button>
          ))}
        </div>
      )}

      {anhMo && (
        <div className="qt-chi-tiet-anh">
          {url[anhMo.duong_dan_xem] && <img src={url[anhMo.duong_dan_xem]} alt={anhMo.chu_thich ?? ''} />}
          <p className="qt-mo" style={{ margin: 0, fontSize: 13 }}>
            {anhMo.nguoi_gui_ten ? `${anhMo.nguoi_gui_ten} gửi` : 'Không rõ người gửi'} · {new Date(anhMo.tao_luc).toLocaleString('vi-VN')}
            {anhMo.chu_thich && <> · “{anhMo.chu_thich}”</>}
          </p>

          <div className="qt-hang">
            {anhMo.trang_thai !== 'da-duyet' && <button className="qt-nut nho chinh" onClick={() => lam(() => capNhatAnh(anhMo.id, { trang_thai: 'da-duyet' }))}>Duyệt</button>}
            {anhMo.trang_thai !== 'an' && <button className="qt-nut nho nguy" onClick={() => lam(() => capNhatAnh(anhMo.id, { trang_thai: 'an' }))}>Ẩn</button>}
            <button className="qt-nut nho" onClick={async () => { const u = await linkTaiGoc(anhMo.duong_dan_goc, `anh-${anhMo.id.slice(0, 8)}`); if (u) window.open(u) }}>Tải ảnh gốc</button>
          </div>

          {anhMo.loai === 'xua' && (
            <>
              <label htmlFor="muc-anh" className="qt-nhan">Mục trong kho ảnh xưa</label>
              <select id="muc-anh" value={anhMo.muc ?? 'khac'} onChange={(e) => lam(() => capNhatAnh(anhMo.id, { muc: e.target.value }))}>
                {MUC_ANH.map((m) => <option key={m.ma} value={m.ma}>{m.ten}</option>)}
              </select>
            </>
          )}

          <label htmlFor="gan-ban" className="qt-nhan">Gắn làm ảnh của một bạn</label>
          <div className="qt-hang">
            <select id="gan-ban" defaultValue="" onChange={(e) => {
              const [kieu, tvId] = e.target.value.split(':')
              if (tvId) lam(() => ganAnhChoBan(tvId, kieu as 'anh_xua_id' | 'anh_nay_id', anhMo.id))
              e.target.value = ''
            }}>
              <option value="">— Chọn bạn —</option>
              <optgroup label="Làm ảnh NGÀY ẤY của">
                {thanhVien.map((t) => <option key={'x' + t.id} value={`anh_xua_id:${t.id}`}>{t.ho_ten}</option>)}
              </optgroup>
              <optgroup label="Làm ảnh BÂY GIỜ của">
                {thanhVien.map((t) => <option key={'n' + t.id} value={`anh_nay_id:${t.id}`}>{t.ho_ten}</option>)}
              </optgroup>
            </select>
          </div>

          <button className="qt-nut nho" onClick={() => lam(() => datAnhBia(lopId, anhMo.id))}>Đặt làm ảnh bìa của lớp</button>
        </div>
      )}
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </section>
  )
}

/* ---------------- Dữ liệu demo ---------------- */
/** Bật/tắt bằng biến VITE_BAT_DEMO trong .env.production (1 = bật, 0 = tắt). */
export const BAT_DEMO = import.meta.env.VITE_BAT_DEMO === '1'

export function NutNapDemo({ lops, nhan }: { lops: LopQuanTri[]; nhan: string }) {
  const [dang, setDang] = useState(false)
  const [tienDo, setTienDo] = useState('')
  const [loi, setLoi] = useState('')
  const chay = async () => {
    if (!window.confirm(`Nạp khoảng 70 ảnh hoạt hình minh họa (duyệt sẵn) vào ${lops.length} lớp? Lớp chưa có thành viên sẽ được thêm 24 bạn mẫu. Giữ trang mở đến khi xong.`)) return
    setDang(true); setLoi('')
    try {
      const { napDemo } = await import('../lib/napDemo') // chỉ tải code vẽ ảnh khi bấm
      for (let i = 0; i < lops.length; i++) {
        const l = lops[i]
        await napDemo(l, (t) => setTienDo(lops.length > 1 ? `Lớp ${l.ten_lop} (${i + 1}/${lops.length}): ${t}` : t))
      }
      setTienDo((t) => t + ' Tải lại trang để xem.')
    } catch (e) { setLoi((e as Error).message) } finally { setDang(false) }
  }
  return (
    <div className="qt-form" style={{ marginTop: 8 }}>
      <button className="qt-nut" onClick={chay} disabled={dang}>{dang ? 'Đang nạp…' : nhan}</button>
      {tienDo && <p className="qt-mo" role="status" style={{ margin: 0, fontSize: 13 }}>{tienDo}</p>}
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </div>
  )
}
