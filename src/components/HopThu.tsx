import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Lop } from '../lib/types'
import { thuCuaLop, vietThu, thuCuaToi, ngayVN, sauNam, type LaThu } from '../lib/thu'
import { THU_MAU } from '../data/lopMau'

const IconPhong = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
  </svg>
)

const homNayMay = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const soNgay = (tu: string, den: string) =>
  Math.round((new Date(den + 'T00:00:00').getTime() - new Date(tu + 'T00:00:00').getTime()) / 86400000)

const LUA_CHON_NAM = [1, 5, 10]

/** Hộp thư thời gian trên trang lớp: thư đã mở, các phong thư đang niêm phong, và ô viết thư. */
export function HopThu({ lop, khoa, laLopMau }: { lop: Lop; khoa: string; laLopMau: boolean }) {
  const [ds, setDs] = useState<LaThu[] | null>(laLopMau ? THU_MAU : null)
  const [homNay, setHomNay] = useState(homNayMay())
  const [moForm, setMoForm] = useState(() => window.location.hash === '#thu')
  const cuaToi = useMemo(() => new Set(thuCuaToi(khoa)), [khoa, ds]) // eslint-disable-line react-hooks/exhaustive-deps

  const tai = useCallback(async () => {
    if (laLopMau) return
    const r = await thuCuaLop(khoa)
    if (r) { setDs(r.thu); setHomNay(r.homNay) } else setDs((d) => d ?? [])
  }, [khoa, laLopMau])
  useEffect(() => { tai() }, [tai])
  useEffect(() => {
    const doi = () => { if (window.location.hash === '#thu') setMoForm(true) }
    window.addEventListener('hashchange', doi)
    return () => window.removeEventListener('hashchange', doi)
  }, [])

  const daMo = (ds ?? []).filter((t) => t.daMo)
  // Gom các phong thư đang niêm phong theo ngày mở
  const niemPhong = useMemo(() => {
    const nhom = new Map<string, LaThu[]>()
    for (const t of ds ?? []) if (!t.daMo && t.ngayMo) nhom.set(t.ngayMo, [...(nhom.get(t.ngayMo) ?? []), t])
    return [...nhom.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [ds])

  return (
    <section className="muc khung" id="thu" aria-labelledby="tieu-de-thu">
      <div className="muc-dau">
        <span className="tieu-de-phu">Viết hôm nay, mở vào lần gặp sau</span>
        <h2 className="tieu-de" id="tieu-de-thu">Hộp thư thời gian</h2>
      </div>

      {ds === null ? <p className="chu-mo">Đang mở hộp thư…</p> : (
        <>
          {daMo.length > 0 && (
            <div className="ds-thu">
              {daMo.map((t) => (
                <article key={t.id} className="the la-thu">
                  <p className="la-thu-noi-dung">{t.noiDung}</p>
                  <footer className="chu-mo">
                    {t.nguoiViet} · viết ngày {ngayVN(t.taoLuc)}{t.ngayMo ? `, mở ngày ${ngayVN(t.ngayMo)}` : ''}{t.buoi ? ` (${t.buoi})` : ''}
                  </footer>
                </article>
              ))}
            </div>
          )}

          {niemPhong.map(([ngay, thu]) => {
            const con = soNgay(homNay, ngay)
            const ten = [...new Set(thu.map((t) => t.nguoiViet))]
            const cua = thu.filter((t) => cuaToi.has(t.id)).length
            return (
              <div key={ngay} className="the phong-thu">
                <span className="phong-thu-icon"><IconPhong /></span>
                <div>
                  <strong>{thu.length} lá thư đang niêm phong</strong>
                  <span className="chu-mo">
                    Mở ngày {ngayVN(ngay)}{thu[0].buoi ? ` · ${thu[0].buoi}` : ''} · còn {con} ngày
                  </span>
                  <span className="chu-mo">
                    Từ {ten.slice(0, 3).join(', ')}{ten.length > 3 ? ` và ${ten.length - 3} bạn khác` : ''}{cua ? ` · có ${cua} thư của bạn` : ''}
                  </span>
                </div>
              </div>
            )
          })}

          {!niemPhong.length && !daMo.length && !moForm && (
            <p className="chu-mo" style={{ fontSize: 15, margin: 0 }}>Chưa có lá thư nào. Viết cho lớp mình của vài năm nữa, đến buổi họp đó cả lớp cùng mở.</p>
          )}
        </>
      )}

      {moForm
        ? <VietThu lop={lop} khoa={khoa} laLopMau={laLopMau} homNay={homNay} onXong={tai} onDong={() => setMoForm(false)} />
        : <button type="button" className="nut-gui" onClick={() => setMoForm(true)}>Viết thư cho lớp</button>}
    </section>
  )
}

function VietThu({ lop, khoa, laLopMau, homNay, onXong, onDong }: {
  lop: Lop; khoa: string; laLopMau: boolean; homNay: string; onXong: () => void; onDong: () => void
}) {
  const buoiSau = lop.chuong.filter((c) => c.ngay && c.ngay > homNay).sort((a, b) => a.ngay.localeCompare(b.ngay))
  const [chon, setChon] = useState<string>(buoiSau[0] ? `buoi:${buoiSau[0].id}` : 'nam:1')
  const [ngayTuChon, setNgayTuChon] = useState('')
  const [noiDung, setNoiDung] = useState('')
  const [ten, setTen] = useState(() => { try { return localStorage.getItem('hoplop:ten') ?? '' } catch { return '' } })
  const [dang, setDang] = useState(false)
  const [kq, setKq] = useState<{ ok: boolean; chu: string } | null>(null)
  const ngayMai = (() => {
    const d = new Date(homNay + 'T00:00:00'); d.setDate(d.getDate() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const kieuO: React.CSSProperties = {
    minHeight: 48, borderRadius: 'var(--bo-sm)', border: '1px solid var(--mau-line)', padding: '0 14px',
    fontSize: 16, fontFamily: 'inherit', background: 'var(--mau-card)', color: 'var(--mau-ink)', width: '100%', boxSizing: 'border-box',
  }

  const gui = async (e: FormEvent) => {
    e.preventDefault(); setKq(null)
    if (laLopMau) { setKq({ ok: false, chu: 'Đây là lớp mẫu để xem thử nên không nhận thư thật. Trang của lớp bạn sẽ viết được như thế này!' }); return }
    const [loai, gt] = chon.split(':')
    const ngay = loai === 'nam' ? sauNam(Number(gt)) : loai === 'ngay' ? ngayTuChon : null
    if (loai === 'ngay' && !ngayTuChon) { setKq({ ok: false, chu: 'Bạn chọn ngày mở thư nhé.' }); return }
    setDang(true)
    try { localStorage.setItem('hoplop:ten', ten.trim()) } catch { /* bỏ qua */ }
    const r = await vietThu(khoa, { nguoiViet: ten, noiDung, chuongId: loai === 'buoi' ? gt : null, ngay })
    setDang(false)
    if (!r.ok) { setKq({ ok: false, chu: r.loi }); return }
    setNoiDung('')
    setKq({ ok: true, chu: `Đã niêm phong lá thư. Hẹn cả lớp mở vào ngày ${ngayVN(r.ngayMo)}.` })
    onXong()
  }

  return (
    <form className="the viet-thu" onSubmit={gui}>
      <fieldset className="chon-hoi-nao">
        <legend>Mở thư vào lúc nào?</legend>
        {buoiSau.length > 0 && (
          <>
            <span className="nhom">Buổi họp sắp tới</span>
            <div className="tab-hang">
              {buoiSau.map((c) => (
                <button key={c.id} type="button" className="tab" aria-pressed={chon === `buoi:${c.id}`} onClick={() => setChon(`buoi:${c.id}`)}>
                  {c.tieuDe} · {ngayVN(c.ngay)}
                </button>
              ))}
            </div>
          </>
        )}
        <span className="nhom">Hoặc sau</span>
        <div className="tab-hang">
          {LUA_CHON_NAM.map((n) => (
            <button key={n} type="button" className="tab" aria-pressed={chon === `nam:${n}`} onClick={() => setChon(`nam:${n}`)}>{n} năm nữa</button>
          ))}
          <button type="button" className="tab" aria-pressed={chon === 'ngay:'} onClick={() => setChon('ngay:')}>Chọn ngày</button>
        </div>
        {chon === 'ngay:' && (
          <>
            <label htmlFor="ngay-mo-thu" className="an-di">Ngày mở thư</label>
            <input id="ngay-mo-thu" type="date" min={ngayMai} value={ngayTuChon} onChange={(e) => setNgayTuChon(e.target.value)} style={kieuO} />
          </>
        )}
      </fieldset>

      <label htmlFor="noi-dung-thu" style={{ fontWeight: 600 }}>Lá thư</label>
      <textarea id="noi-dung-thu" rows={6} maxLength={3000} value={noiDung} onChange={(e) => setNoiDung(e.target.value)} required
        placeholder="Gửi lớp mình của vài năm sau…" style={{ ...kieuO, padding: '12px 14px', resize: 'vertical', lineHeight: 1.5 }} />
      <span className="chu-mo" style={{ alignSelf: 'flex-end' }}>{noiDung.length}/3000</span>

      <label htmlFor="ten-thu" style={{ fontWeight: 600 }}>Ký tên</label>
      <input id="ten-thu" value={ten} onChange={(e) => setTen(e.target.value)} maxLength={60} required placeholder="Vd: Lan Béo" style={kieuO} />

      <p className="chu-mo" style={{ margin: 0, fontSize: 13 }}>Thư được niêm phong: không ai trong lớp đọc được, kể cả lớp trưởng, cho đến ngày mở.</p>
      {kq && <p role="status" className="the" style={{ padding: 12, margin: 0, color: kq.ok ? 'var(--mau-ink)' : 'var(--mau-accent)' }}>{kq.chu}</p>}
      <div className="hang-nut-thu">
        <button className="nut chinh" disabled={dang || !noiDung.trim()}>{dang ? 'Đang niêm phong…' : 'Niêm phong và gửi'}</button>
        <button type="button" className="nut nut-phu" onClick={onDong}>Đóng</button>
      </div>
    </form>
  )
}
