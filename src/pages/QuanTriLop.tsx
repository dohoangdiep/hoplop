import { useEffect, useMemo, useState } from 'react'
import {
  dsThanhVien, phanTichDanhSach, themThanhVien, suaThanhVien, xoaThanhVien,
  laySoDo, luuSoDo, khoaCho, type ThanhVienQT, type SoDoQT,
} from '../lib/quanTri'

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
        {soCho} chỗ · {thanhVien.length} bạn · còn {chuaXep.length} bạn chưa xếp · {Math.max(0, soChoTrong)} chỗ trống. Bấm vào một chỗ để chọn bạn ngồi đó.
      </p>
      {thieuCho > 0 && (
        <div className="qt-canh-bao" role="status">
          Thiếu {thieuCho} chỗ cho các bạn chưa xếp.
          <button className="qt-nut nho" onClick={themDayChoDu}>Thêm dãy cho đủ chỗ</button>
          <span>Hoặc cứ để vậy: các bạn không có chỗ vẫn hiện ở dòng “Các bạn khác của lớp” dưới sơ đồ.</span>
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
