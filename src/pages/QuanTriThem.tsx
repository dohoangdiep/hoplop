/** Quản trị Tái hiện và Góc thầy cô của một lớp (chủ dịch vụ dựng hộ). */
import { useEffect, useState, type FormEvent } from 'react'
import {
  dsAnh, type AnhQT, taiAnhRieng, linkTheoId,
  dsTaiHienQT, luuTaiHien, xoaTaiHien, type TaiHienQT,
  dsThayCoQT, luuThayCo, xoaThayCo, type ThayCoQT,
} from '../lib/quanTri'
import { linkXemNhieu } from '../lib/storage'
import { TEN_MUC } from '../lib/guiAnh'

/* ---------------- Chọn ảnh: từ kho của lớp hoặc tải lên ---------------- */
function ChonTrongKho({ lopId, onChon, onDong }: { lopId: string; onChon: (id: string) => void; onDong: () => void }) {
  const [ds, setDs] = useState<AnhQT[] | null>(null)
  const [url, setUrl] = useState<Record<string, string>>({})
  const [loc, setLoc] = useState<'xua' | 'chuong' | 'rieng'>('xua')
  useEffect(() => {
    dsAnh(lopId).then(async (d) => {
      const conDung = d.filter((a) => a.trang_thai !== 'an')
      setDs(conDung)
      setUrl(await linkXemNhieu(conDung.map((a) => a.duong_dan_xem)))
    }).catch(() => setDs([]))
  }, [lopId])
  const hien = (ds ?? []).filter((a) =>
    loc === 'chuong' ? a.loai === 'chuong' : loc === 'rieng' ? a.muc === 'chan-dung' : a.loai === 'xua' && a.muc !== 'chan-dung')
  return (
    <div className="qt-the qt-form" style={{ marginTop: 6 }}>
      <div className="qt-hang" role="group" aria-label="Lọc ảnh">
        {([['xua', 'Ảnh xưa'], ['chuong', 'Buổi họp'], ['rieng', 'Ảnh riêng đã tải']] as const).map(([k, t]) => (
          <button key={k} type="button" className={`qt-nut nho ${loc === k ? 'chinh' : ''}`} onClick={() => setLoc(k)}>{t}</button>
        ))}
        <button type="button" className="qt-nut nho" onClick={onDong}>Đóng</button>
      </div>
      {ds === null ? <p>Đang tải…</p> : hien.length === 0 ? <p className="qt-mo">Không có ảnh nào ở mục này.</p> : (
        <div className="qt-luoi-anh">
          {hien.map((a) => (
            <button key={a.id} type="button" className="qt-o-anh" onClick={() => onChon(a.id)}
              aria-label={`Chọn ảnh${a.chu_thich ? ': ' + a.chu_thich : ''}`}>
              {url[a.duong_dan_xem] ? <img src={url[a.duong_dan_xem]} alt="" loading="lazy" /> : <span>…</span>}
              <small>{a.trang_thai === 'cho-duyet' ? 'Chờ duyệt' : a.loai === 'xua' ? (a.muc ? TEN_MUC[a.muc] ?? 'Riêng' : 'Chưa rõ') : 'Buổi họp'}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ONhanAnh({ nhan, anhId, url, lopId, lopMa, chuThichTai, onDoi }: {
  nhan: string; anhId: string | null; url?: string; lopId: string; lopMa: string; chuThichTai: string; onDoi: (id: string | null) => void
}) {
  const [moKho, setMoKho] = useState(false)
  const [dangTai, setDangTai] = useState(false)
  const [loi, setLoi] = useState('')
  const tai = async (f?: File) => {
    if (!f) return
    setLoi(''); setDangTai(true)
    try { onDoi(await taiAnhRieng(lopMa, f, chuThichTai)) } catch (e) { setLoi((e as Error).message) } finally { setDangTai(false) }
  }
  return (
    <div className="qt-o-chon-anh">
      <span className="qt-nhan" style={{ marginTop: 0 }}>{nhan}</span>
      <div className="qt-xem-anh-chon">{anhId && url ? <img src={url} alt={nhan} /> : <span>{anhId ? 'Đã chọn' : 'Chưa có ảnh'}</span>}</div>
      <div className="qt-hang">
        <button type="button" className="qt-nut nho" onClick={() => setMoKho(!moKho)}>Chọn trong kho</button>
        <label className="qt-nut nho" style={{ position: 'relative' }}>
          {dangTai ? 'Đang tải…' : 'Tải ảnh lên'}
          <input type="file" accept="image/*" disabled={dangTai} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            onChange={(e) => { tai(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        {anhId && <button type="button" className="qt-nut nho" onClick={() => onDoi(null)}>Bỏ ảnh</button>}
      </div>
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
      {moKho && <ChonTrongKho lopId={lopId} onDong={() => setMoKho(false)} onChon={(id) => { onDoi(id); setMoKho(false) }} />}
    </div>
  )
}

const soHoacNull = (s: string) => (s.trim() && /^\d{4}$/.test(s.trim()) ? Number(s.trim()) : null)

/* ---------------- Tái hiện ---------------- */
function FormTaiHien({ lopId, lopMa, dau, onXong, onHuy }: {
  lopId: string; lopMa: string; dau?: TaiHienQT; onXong: () => void; onHuy: () => void
}) {
  const [xua, setXua] = useState<string | null>(dau?.anh_xua_id ?? null)
  const [nay, setNay] = useState<string | null>(dau?.anh_nay_id ?? null)
  const [namXua, setNamXua] = useState(dau?.nam_xua ? String(dau.nam_xua) : '')
  const [namNay, setNamNay] = useState(dau?.nam_nay ? String(dau.nam_nay) : String(new Date().getFullYear()))
  const [chuThich, setChuThich] = useState(dau?.chu_thich ?? '')
  const [url, setUrl] = useState<Record<string, string>>({})
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState('')
  useEffect(() => { linkTheoId([xua, nay]).then(setUrl) }, [xua, nay])
  const id = (k: string) => `th-${k}-${dau?.id ?? 'moi'}`

  const luu = async (e: FormEvent) => {
    e.preventDefault(); setLoi('')
    if (!xua || !nay) { setLoi('Cần đủ cả ảnh ngày ấy và ảnh bây giờ.'); return }
    setDang(true)
    try {
      await luuTaiHien(lopId, dau?.id ?? null, {
        anh_xua_id: xua, anh_nay_id: nay, chu_thich: chuThich.trim() || null, nam_xua: soHoacNull(namXua), nam_nay: soHoacNull(namNay),
      })
      onXong()
    } catch (er) { setLoi((er as Error).message) } finally { setDang(false) }
  }
  return (
    <form className="qt-form qt-the" onSubmit={luu}>
      <div className="qt-hai-cot">
        <ONhanAnh nhan="Ảnh ngày ấy" anhId={xua} url={xua ? url[xua] : undefined} lopId={lopId} lopMa={lopMa} chuThichTai="Tái hiện · ngày ấy" onDoi={setXua} />
        <ONhanAnh nhan="Ảnh bây giờ" anhId={nay} url={nay ? url[nay] : undefined} lopId={lopId} lopMa={lopMa} chuThichTai="Tái hiện · bây giờ" onDoi={setNay} />
      </div>
      <div className="qt-hai-cot">
        <div><label htmlFor={id('nx')}>Năm chụp ảnh xưa</label><input id={id('nx')} inputMode="numeric" maxLength={4} value={namXua} onChange={(e) => setNamXua(e.target.value.replace(/\D/g, ''))} placeholder="2005" /></div>
        <div><label htmlFor={id('nn')}>Năm chụp lại</label><input id={id('nn')} inputMode="numeric" maxLength={4} value={namNay} onChange={(e) => setNamNay(e.target.value.replace(/\D/g, ''))} placeholder="2026" /></div>
      </div>
      <label htmlFor={id('ct')}>Vài dòng kể</label>
      <textarea id={id('ct')} rows={2} className="qt-o-van" value={chuThich} onChange={(e) => setChuThich(e.target.value)}
        placeholder="Sáu bạn nam xếp tháp người, 21 năm sau vẫn đủ người, chỉ là tháp thấp hơn một chút." />
      <div className="qt-hang">
        <button className="qt-nut chinh" disabled={dang}>{dang ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" className="qt-nut" onClick={onHuy}>Hủy</button>
      </div>
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </form>
  )
}

export function QuanLyTaiHien({ lopId, lopMa }: { lopId: string; lopMa: string }) {
  const [ds, setDs] = useState<TaiHienQT[] | null>(null)
  const [url, setUrl] = useState<Record<string, string>>({})
  const [sua, setSua] = useState<string | null>(null)
  const [loi, setLoi] = useState('')
  const tai = async () => {
    try {
      const d = await dsTaiHienQT(lopId)
      setDs(d); setUrl(await linkTheoId(d.flatMap((t) => [t.anh_xua_id, t.anh_nay_id])))
    } catch (e) { setLoi((e as Error).message); setDs([]) }
  }
  useEffect(() => { tai() }, [lopId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="qt-muc">
      <div className="qt-tieu-de">
        <h2>Tái hiện ({ds?.length ?? 0})</h2>
        {sua !== 'moi' && <button className="qt-nut nho chinh" onClick={() => setSua('moi')}>Thêm cặp ảnh</button>}
      </div>
      <p className="qt-mo" style={{ fontSize: 13, marginTop: 0 }}>Ảnh xưa đặt cạnh ảnh chụp lại cùng tư thế ở buổi họp. Chọn ảnh có sẵn trong kho của lớp, hoặc tải ảnh mới lên (ảnh tải ở đây không hiện trong kho ảnh xưa).</p>
      {sua === 'moi' && <FormTaiHien lopId={lopId} lopMa={lopMa} onHuy={() => setSua(null)} onXong={() => { setSua(null); tai() }} />}
      {ds && ds.length > 0 && (
        <ul className="qt-ds-chuong">
          {ds.map((t) => (
            <li key={t.id}>
              {sua === t.id ? (
                <FormTaiHien lopId={lopId} lopMa={lopMa} dau={t} onHuy={() => setSua(null)} onXong={() => { setSua(null); tai() }} />
              ) : (
                <>
                  <div className="qt-cap-anh">
                    {[t.anh_xua_id, t.anh_nay_id].map((a, i) => (
                      <figure key={i}>
                        <div className="qt-xem-anh-chon">{a && url[a] ? <img src={url[a]} alt="" /> : <span>Thiếu ảnh</span>}</div>
                        <figcaption>{(i === 0 ? t.nam_xua : t.nam_nay) ?? (i === 0 ? 'Ngày ấy' : 'Bây giờ')}</figcaption>
                      </figure>
                    ))}
                  </div>
                  {t.chu_thich && <span className="qt-mo">{t.chu_thich}</span>}
                  <div className="qt-hang">
                    <button className="qt-nut nho" onClick={() => setSua(t.id)}>Sửa</button>
                    <button className="qt-nut nho nguy" onClick={async () => {
                      if (!window.confirm('Xóa cặp ảnh này khỏi mục Tái hiện? (Ảnh vẫn còn trong kho.)')) return
                      try { await xoaTaiHien(t.id); tai() } catch (e) { setLoi((e as Error).message) }
                    }}>Xóa</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </section>
  )
}

/* ---------------- Góc thầy cô ---------------- */
function FormThayCo({ lopId, lopMa, dau, soLuong, onXong, onHuy }: {
  lopId: string; lopMa: string; dau?: ThayCoQT; soLuong: number; onXong: () => void; onHuy: () => void
}) {
  const [f, setF] = useState({ ho_ten: dau?.ho_ten ?? '', vai_tro: dau?.vai_tro ?? '', mon: dau?.mon ?? '', cau_noi: dau?.cau_noi ?? '' })
  const [anh, setAnh] = useState<string | null>(dau?.anh_id ?? null)
  const [url, setUrl] = useState<Record<string, string>>({})
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState('')
  useEffect(() => { linkTheoId([anh]).then(setUrl) }, [anh])
  const doi = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const id = (k: string) => `tc-${k}-${dau?.id ?? 'moi'}`
  const luu = async (e: FormEvent) => {
    e.preventDefault(); setLoi(''); setDang(true)
    try {
      await luuThayCo(lopId, dau?.id ?? null, {
        ho_ten: f.ho_ten.trim(), vai_tro: f.vai_tro.trim() || null, mon: f.mon.trim() || null,
        cau_noi: f.cau_noi.trim().replace(/^["“]|["”]$/g, '') || null, anh_id: anh, thu_tu: dau?.thu_tu ?? soLuong,
      })
      onXong()
    } catch (er) { setLoi((er as Error).message) } finally { setDang(false) }
  }
  return (
    <form className="qt-form qt-the" onSubmit={luu}>
      <label htmlFor={id('ten')}>Họ tên (có cả “Thầy” hoặc “Cô”)</label>
      <input id={id('ten')} required value={f.ho_ten} onChange={doi('ho_ten')} placeholder="Cô Trần Thị Lan" />
      <div className="qt-hai-cot">
        <div><label htmlFor={id('vt')}>Vai trò</label><input id={id('vt')} value={f.vai_tro} onChange={doi('vai_tro')} placeholder="Chủ nhiệm" /></div>
        <div><label htmlFor={id('mon')}>Dạy môn</label><input id={id('mon')} value={f.mon} onChange={doi('mon')} placeholder="Văn" /></div>
      </div>
      <label htmlFor={id('cn')}>Câu thầy cô hay nói, hoặc lời nhắn cho lớp</label>
      <textarea id={id('cn')} rows={2} className="qt-o-van" value={f.cau_noi} onChange={doi('cau_noi')} placeholder="Các em cứ đi xa, nhưng nhớ đường về lớp." />
      <ONhanAnh nhan="Ảnh thầy cô" anhId={anh} url={anh ? url[anh] : undefined} lopId={lopId} lopMa={lopMa} chuThichTai={f.ho_ten || 'Thầy cô'} onDoi={setAnh} />
      <div className="qt-hang">
        <button className="qt-nut chinh" disabled={dang}>{dang ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" className="qt-nut" onClick={onHuy}>Hủy</button>
      </div>
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </form>
  )
}

export function QuanLyThayCo({ lopId, lopMa }: { lopId: string; lopMa: string }) {
  const [ds, setDs] = useState<ThayCoQT[] | null>(null)
  const [url, setUrl] = useState<Record<string, string>>({})
  const [sua, setSua] = useState<string | null>(null)
  const [loi, setLoi] = useState('')
  const tai = async () => {
    try { const d = await dsThayCoQT(lopId); setDs(d); setUrl(await linkTheoId(d.map((c) => c.anh_id))) }
    catch (e) { setLoi((e as Error).message); setDs([]) }
  }
  useEffect(() => { tai() }, [lopId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="qt-muc">
      <div className="qt-tieu-de">
        <h2>Góc thầy cô ({ds?.length ?? 0})</h2>
        {sua !== 'moi' && <button className="qt-nut nho chinh" onClick={() => setSua('moi')}>Thêm thầy cô</button>}
      </div>
      {sua === 'moi' && <FormThayCo lopId={lopId} lopMa={lopMa} soLuong={ds?.length ?? 0} onHuy={() => setSua(null)} onXong={() => { setSua(null); tai() }} />}
      {ds && ds.length > 0 && (
        <ul className="qt-ds-tv">
          {ds.map((c) => sua === c.id ? (
            <li key={c.id} className="qt-sua-tv">
              <FormThayCo lopId={lopId} lopMa={lopMa} dau={c} soLuong={ds.length} onHuy={() => setSua(null)} onXong={() => { setSua(null); tai() }} />
            </li>
          ) : (
            <li key={c.id}>
              <div className="qt-anh-tv"><span className="qt-o-anh co">{c.anh_id && url[c.anh_id] ? <img src={url[c.anh_id]} alt="" /> : null}</span></div>
              <div>
                <strong>{c.ho_ten}</strong>
                <span>{[c.vai_tro, c.mon && `dạy ${c.mon}`].filter(Boolean).join(' · ') || ' '}</span>
              </div>
              <div className="qt-hang">
                <button className="qt-nut nho" onClick={() => setSua(c.id)}>Sửa</button>
                <button className="qt-nut nho nguy" onClick={async () => {
                  if (!window.confirm(`Xóa ${c.ho_ten} khỏi Góc thầy cô?`)) return
                  try { await xoaThayCo(c.id); tai() } catch (e) { setLoi((e as Error).message) }
                }}>Xóa</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </section>
  )
}
