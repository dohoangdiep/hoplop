/** Tab "Tái hiện & thầy cô" trên trang lớp trưởng: lớp trưởng / lớp phó tự thêm, sửa, xóa. */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  dsThem, datAnhRieng, luuTaiHienLT, xoaTaiHienLT, luuThayCoLT, xoaThayCoLT, tokenLopTruong, HetPhien,
  type DuLieuLT, type TaiHienLT, type ThayCoLT,
} from '../lib/lopTruong'
import { guiAnh, tenMuc } from '../lib/guiAnh'
import { linkXemNhieu } from '../lib/storage'

type Lam = (viec: () => Promise<unknown>, thongBao?: string) => Promise<boolean>

/* ---------------- Một ô ảnh: chọn trong ảnh của lớp, hoặc tải ảnh mới ---------------- */
function OAnh({ nhan, anhId, xemTruoc, dl, url, onDoi, onHetPhien }: {
  nhan: string; anhId: string | null; xemTruoc?: string; dl: DuLieuLT; url: Record<string, string>
  onDoi: (id: string | null, xemTruoc?: string) => void; onHetPhien: () => void
}) {
  const [mo, setMo] = useState(false)
  const [loc, setLoc] = useState<'xua' | 'chuong'>('xua')
  const [dangTai, setDangTai] = useState(false)
  const [loi, setLoi] = useState('')
  const tenChuong = useMemo(() => new Map(dl.chuong.map((c) => [c.id, c.tieu_de])), [dl.chuong])
  const ds = dl.anh.filter((a) => a.trang_thai !== 'an' && a.loai === loc)

  const tai = async (f?: File) => {
    if (!f) return
    setLoi(''); setDangTai(true)
    try {
      const r = await guiAnh([f], { khoa: dl.lop.ma, muc: 'khac', nguoiGui: dl.ho_ten, chuThich: nhan, tokenLopTruong: tokenLopTruong() }, () => {})
      if (r.loi || !r.ids[0]) throw new Error(r.loi ?? 'Tải ảnh không thành công, bạn thử lại nhé.')
      await datAnhRieng(dl.lop.id, r.ids[0])
      onDoi(r.ids[0], URL.createObjectURL(f))
    } catch (e) {
      if (e instanceof HetPhien) onHetPhien()
      else setLoi((e as Error).message)
    } finally { setDangTai(false) }
  }

  return (
    <div className="lt-o-chon">
      <span className="lt-nhan" style={{ marginTop: 0 }}>{nhan}</span>
      <div className="khung-anh xua lt-xem-chon">{anhId && xemTruoc ? <img src={xemTruoc} alt={nhan} /> : <span>{anhId ? 'Đã chọn' : 'Chưa có ảnh'}</span>}</div>
      <div className="lt-hang-nut">
        <button type="button" className="nut lt-nut-vien" aria-expanded={mo} onClick={() => setMo(!mo)}>Chọn ảnh của lớp</button>
        <label className="nut lt-nut-vien lt-nut-tai">
          {dangTai ? 'Đang tải…' : 'Tải ảnh mới'}
          <input type="file" accept="image/*" disabled={dangTai} className="an-di" onChange={(e) => { tai(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>
      {loi && <span role="alert" className="lt-loi">{loi}</span>}
      {mo && (
        <div className="the lt-chon-kho">
          <div className="tab-hang" role="group" aria-label="Loại ảnh">
            <button type="button" className="tab lt-tab" aria-pressed={loc === 'xua'} onClick={() => setLoc('xua')}>Ảnh xưa</button>
            <button type="button" className="tab lt-tab" aria-pressed={loc === 'chuong'} onClick={() => setLoc('chuong')}>Ảnh buổi họp</button>
          </div>
          {ds.length === 0 ? <p className="chu-mo">Chưa có ảnh nào ở đây.</p> : (
            <ul className="lt-luoi">
              {ds.map((a) => (
                <li key={a.id}>
                  <button type="button" className="lt-o-anh khung-anh xua" onClick={() => { onDoi(a.id, url[a.xem]); setMo(false) }}
                    aria-label={`Chọn ảnh${a.chu_thich ? ': ' + a.chu_thich : ''}`}>
                    {url[a.xem] ? <img src={url[a.xem]} alt="" loading="lazy" /> : <span className="lt-khong-anh">Ảnh</span>}
                    <small>{a.loai === 'chuong' ? tenChuong.get(a.chuong_id ?? '') ?? 'Buổi họp' : tenMuc(a.muc, dl.lop.cap)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const nam4 = (s: string) => (/^\d{4}$/.test(s.trim()) ? Number(s.trim()) : null)

/* ---------------- Tái hiện ---------------- */
function FormTaiHien({ dl, url, dau, xemDau, lam, onXong, onHuy, onHetPhien }: {
  dl: DuLieuLT; url: Record<string, string>; dau?: TaiHienLT; xemDau: Record<string, string>; lam: Lam
  onXong: () => void; onHuy: () => void; onHetPhien: () => void
}) {
  const [xua, setXua] = useState<{ id: string | null; xem?: string }>({ id: dau?.anh_xua_id ?? null, xem: dau?.xua ? xemDau[dau.xua] : undefined })
  const [nay, setNay] = useState<{ id: string | null; xem?: string }>({ id: dau?.anh_nay_id ?? null, xem: dau?.nay ? xemDau[dau.nay] : undefined })
  const [namXua, setNamXua] = useState(dau?.nam_xua ? String(dau.nam_xua) : '')
  const [namNay, setNamNay] = useState(dau?.nam_nay ? String(dau.nam_nay) : String(new Date().getFullYear()))
  const [chuThich, setChuThich] = useState(dau?.chu_thich ?? '')
  const [loi, setLoi] = useState('')
  const [dang, setDang] = useState(false)
  const k = (s: string) => `lt-th-${s}-${dau?.id ?? 'moi'}`

  const luu = async (e: FormEvent) => {
    e.preventDefault(); setLoi('')
    if (!xua.id || !nay.id) { setLoi('Cần đủ cả ảnh ngày ấy và ảnh bây giờ.'); return }
    setDang(true)
    const ok = await lam(() => luuTaiHienLT(dl.lop.id, dau?.id ?? null, {
      xua: xua.id!, nay: nay.id!, chuThich, namXua: nam4(namXua), namNay: nam4(namNay),
    }), dau ? 'Đã lưu.' : 'Đã thêm cặp ảnh vào mục Tái hiện.')
    setDang(false)
    if (ok) onXong()
  }

  return (
    <form className="the lt-form" onSubmit={luu}>
      <div className="lt-hai-cot">
        <OAnh nhan="Ảnh ngày ấy" anhId={xua.id} xemTruoc={xua.xem} dl={dl} url={url} onDoi={(id, xem) => setXua({ id, xem })} onHetPhien={onHetPhien} />
        <OAnh nhan="Ảnh bây giờ" anhId={nay.id} xemTruoc={nay.xem} dl={dl} url={url} onDoi={(id, xem) => setNay({ id, xem })} onHetPhien={onHetPhien} />
      </div>
      <div className="lt-hai-cot">
        <div><label htmlFor={k('nx')}>Năm chụp ảnh xưa</label><input id={k('nx')} inputMode="numeric" maxLength={4} value={namXua} onChange={(e) => setNamXua(e.target.value.replace(/\D/g, ''))} placeholder="2005" /></div>
        <div><label htmlFor={k('nn')}>Năm chụp lại</label><input id={k('nn')} inputMode="numeric" maxLength={4} value={namNay} onChange={(e) => setNamNay(e.target.value.replace(/\D/g, ''))} placeholder="2026" /></div>
      </div>
      <label htmlFor={k('ct')}>Vài dòng kể</label>
      <textarea id={k('ct')} rows={3} value={chuThich} onChange={(e) => setChuThich(e.target.value)} placeholder="Sáu bạn nam xếp tháp người, 21 năm sau vẫn đủ người…" />
      {loi && <span role="alert" className="lt-loi">{loi}</span>}
      <div className="lt-hang-nut">
        <button className="nut chinh" disabled={dang}>{dang ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" className="nut lt-nut-vien" onClick={onHuy}>Hủy</button>
      </div>
    </form>
  )
}

/* ---------------- Góc thầy cô ---------------- */
function FormThayCo({ dl, url, dau, xemDau, lam, onXong, onHuy, onHetPhien }: {
  dl: DuLieuLT; url: Record<string, string>; dau?: ThayCoLT; xemDau: Record<string, string>; lam: Lam
  onXong: () => void; onHuy: () => void; onHetPhien: () => void
}) {
  const [f, setF] = useState({ hoTen: dau?.ho_ten ?? '', vaiTro: dau?.vai_tro ?? '', mon: dau?.mon ?? '', cauNoi: dau?.cau_noi ?? '' })
  const [anh, setAnh] = useState<{ id: string | null; xem?: string }>({ id: dau?.anh_id ?? null, xem: dau?.anh ? xemDau[dau.anh] : undefined })
  const [dang, setDang] = useState(false)
  const doi = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [key]: e.target.value })
  const k = (s: string) => `lt-tc-${s}-${dau?.id ?? 'moi'}`
  const luu = async (e: FormEvent) => {
    e.preventDefault(); setDang(true)
    const ok = await lam(() => luuThayCoLT(dl.lop.id, dau?.id ?? null, {
      ...f, cauNoi: f.cauNoi.trim().replace(/^["“]|["”]$/g, ''), anhId: anh.id,
    }), dau ? 'Đã lưu.' : 'Đã thêm vào Góc thầy cô.')
    setDang(false)
    if (ok) onXong()
  }
  return (
    <form className="the lt-form" onSubmit={luu}>
      <label htmlFor={k('ten')}>Họ tên (có cả “Thầy” hoặc “Cô”)</label>
      <input id={k('ten')} required maxLength={80} value={f.hoTen} onChange={doi('hoTen')} placeholder="Cô Trần Thị Lan" />
      <div className="lt-hai-cot">
        <div><label htmlFor={k('vt')}>Vai trò</label><input id={k('vt')} value={f.vaiTro} onChange={doi('vaiTro')} placeholder="Chủ nhiệm" /></div>
        <div><label htmlFor={k('mon')}>Dạy môn</label><input id={k('mon')} value={f.mon} onChange={doi('mon')} placeholder="Văn" /></div>
      </div>
      <label htmlFor={k('cn')}>Câu thầy cô hay nói, hoặc lời nhắn cho lớp</label>
      <textarea id={k('cn')} rows={2} maxLength={500} value={f.cauNoi} onChange={doi('cauNoi')} placeholder="Các em cứ đi xa, nhưng nhớ đường về lớp." />
      <OAnh nhan="Ảnh thầy cô" anhId={anh.id} xemTruoc={anh.xem} dl={dl} url={url} onDoi={(id, xem) => setAnh({ id, xem })} onHetPhien={onHetPhien} />
      {anh.id && <button type="button" className="lt-link" onClick={() => setAnh({ id: null })}>Bỏ ảnh</button>}
      <div className="lt-hang-nut">
        <button className="nut chinh" disabled={dang}>{dang ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" className="nut lt-nut-vien" onClick={onHuy}>Hủy</button>
      </div>
    </form>
  )
}

/* ---------------- Cả tab ---------------- */
export function TaiHienThayCo({ dl, url, lam, onHetPhien }: { dl: DuLieuLT; url: Record<string, string>; lam: Lam; onHetPhien: () => void }) {
  const [them, setThem] = useState<{ tai_hien: TaiHienLT[]; thay_co: ThayCoLT[] } | null>(null)
  const [xem, setXem] = useState<Record<string, string>>({})
  const [sua, setSua] = useState<string | null>(null) // 'th-moi' | 'tc-moi' | id
  const [loi, setLoi] = useState('')

  const tai = useCallback(async () => {
    try {
      const d = await dsThem(dl.lop.id)
      setThem(d)
      setXem(await linkXemNhieu([...d.tai_hien.flatMap((t) => [t.xua, t.nay]), ...d.thay_co.map((c) => c.anh)], 3600, tokenLopTruong()))
    } catch (e) {
      if (e instanceof HetPhien) onHetPhien()
      else setLoi((e as Error).message)
    }
  }, [dl.lop.id, onHetPhien])
  useEffect(() => { tai() }, [tai])

  const xong = () => { setSua(null); tai() }
  if (!them) return <p className="chu-mo">{loi || 'Đang tải…'}</p>

  return (
    <div className="lt-phan">
      <section className="lt-phan" aria-labelledby="lt-tieu-de-th">
        <div className="lt-tieu-de">
          <h2 id="lt-tieu-de-th" className="tieu-de" style={{ fontSize: 22, margin: 0 }}>Tái hiện</h2>
          {sua !== 'th-moi' && <button type="button" className="nut chinh lt-nut-gon" onClick={() => setSua('th-moi')}>Thêm cặp ảnh</button>}
        </div>
        <p className="chu-mo" style={{ fontSize: 14, margin: 0 }}>Ảnh xưa đặt cạnh ảnh chụp lại cùng tư thế. Chọn ảnh các bạn đã gửi cho lớp, hoặc tải ảnh mới từ máy.</p>
        {sua === 'th-moi' && <FormTaiHien dl={dl} url={url} xemDau={xem} lam={lam} onXong={xong} onHuy={() => setSua(null)} onHetPhien={onHetPhien} />}
        {them.tai_hien.length === 0 && sua !== 'th-moi' && <p className="chu-mo lt-trong">Chưa có cặp ảnh nào.</p>}
        <ul className="lt-ds-buoi">
          {them.tai_hien.map((t) => (
            <li key={t.id} className="the">
              {sua === t.id ? (
                <FormTaiHien dl={dl} url={url} dau={t} xemDau={xem} lam={lam} onXong={xong} onHuy={() => setSua(null)} onHetPhien={onHetPhien} />
              ) : (
                <>
                  <div className="lt-hai-cot">
                    {([[t.xua, t.nam_xua ?? 'Ngày ấy'], [t.nay, t.nam_nay ?? 'Bây giờ']] as const).map(([p, n], i) => (
                      <figure key={i} className="lt-cap-anh">
                        <div className="khung-anh xua lt-xem-chon">{p && xem[p] ? <img src={xem[p]} alt="" loading="lazy" /> : <span>Thiếu ảnh</span>}</div>
                        <figcaption>{n}</figcaption>
                      </figure>
                    ))}
                  </div>
                  {t.chu_thich && <span className="chu-mo" style={{ fontSize: 14 }}>{t.chu_thich}</span>}
                  <div className="lt-hang-nut">
                    <button type="button" className="nut lt-nut-vien" onClick={() => setSua(t.id)}>Sửa</button>
                    <button type="button" className="nut lt-nut-vien lt-nguy" onClick={() => {
                      if (window.confirm('Xóa cặp ảnh này khỏi mục Tái hiện? Ảnh vẫn còn trong kho của lớp.'))
                        lam(() => xoaTaiHienLT(dl.lop.id, t.id), 'Đã xóa.').then((ok) => { if (ok) tai() })
                    }}>Xóa</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="lt-phan" aria-labelledby="lt-tieu-de-tc" style={{ marginTop: 18 }}>
        <div className="lt-tieu-de">
          <h2 id="lt-tieu-de-tc" className="tieu-de" style={{ fontSize: 22, margin: 0 }}>Góc thầy cô</h2>
          {sua !== 'tc-moi' && <button type="button" className="nut chinh lt-nut-gon" onClick={() => setSua('tc-moi')}>Thêm thầy cô</button>}
        </div>
        {sua === 'tc-moi' && <FormThayCo dl={dl} url={url} xemDau={xem} lam={lam} onXong={xong} onHuy={() => setSua(null)} onHetPhien={onHetPhien} />}
        {them.thay_co.length === 0 && sua !== 'tc-moi' && <p className="chu-mo lt-trong">Chưa có thầy cô nào.</p>}
        <ul className="lt-ds-buoi">
          {them.thay_co.map((c) => (
            <li key={c.id} className="the">
              {sua === c.id ? (
                <FormThayCo dl={dl} url={url} dau={c} xemDau={xem} lam={lam} onXong={xong} onHuy={() => setSua(null)} onHetPhien={onHetPhien} />
              ) : (
                <>
                  <div className="lt-thay-co">
                    <div className="khung-anh nay lt-anh-thay-co">{c.anh && xem[c.anh] ? <img src={xem[c.anh]} alt="" loading="lazy" /> : null}</div>
                    <div>
                      <strong>{c.ho_ten}</strong>
                      <span className="chu-mo">{[c.vai_tro, c.mon && `dạy ${c.mon}`].filter(Boolean).join(' · ')}</span>
                      {c.cau_noi && <span className="chu-mo">“{c.cau_noi}”</span>}
                    </div>
                  </div>
                  <div className="lt-hang-nut">
                    <button type="button" className="nut lt-nut-vien" onClick={() => setSua(c.id)}>Sửa</button>
                    <button type="button" className="nut lt-nut-vien lt-nguy" onClick={() => {
                      if (window.confirm(`Xóa ${c.ho_ten} khỏi Góc thầy cô?`))
                        lam(() => xoaThayCoLT(dl.lop.id, c.id), 'Đã xóa.').then((ok) => { if (ok) tai() })
                    }}>Xóa</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
