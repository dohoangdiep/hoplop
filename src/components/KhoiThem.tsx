import { useState } from 'react'
import type { TaiHien as TaiHienT, ThayCo } from '../lib/types'
import { PhongTo } from './KhoiTrangLop'

const IconNguoi = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
)

/** Khung một ảnh của cặp Tái hiện: có ảnh thì bấm xem lớn, chưa có thì hiện nhãn */
function KhungTaiHien({ url, nhan, kieu, onMo }: { url?: string; nhan?: string; kieu: 'xua' | 'nay'; onMo: () => void }) {
  if (!url) return <div className={`khung-anh ${kieu} anh-tai-hien`}>{nhan ?? ''}</div>
  return (
    <button type="button" className={`khung-anh ${kieu} anh-tai-hien nut-anh`} onClick={onMo} aria-label={`Xem lớn ảnh ${kieu === 'xua' ? 'ngày ấy' : 'bây giờ'}`}>
      <img src={url} alt="" loading="lazy" />
    </button>
  )
}

/** Tái hiện: ảnh xưa đặt cạnh ảnh chụp lại cùng tư thế */
export function TaiHien({ ds }: { ds: TaiHienT[] }) {
  const [phong, setPhong] = useState<{ cap: number; viTri: number } | null>(null)
  if (!ds.length) return null
  const anhCap = (t: TaiHienT) => [
    { url: t.xuaUrl, chuThich: `${t.namXua ?? 'Ngày ấy'} · ${t.chuThich}` },
    { url: t.nayUrl, chuThich: `${t.namNay ?? 'Bây giờ'} · ${t.chuThich}` },
  ]
  return (
    <section className="muc khung" aria-labelledby="tieu-de-tai-hien">
      <div className="muc-dau">
        <span className="tieu-de-phu">Chụp lại y như hồi ấy</span>
        <h2 className="tieu-de" id="tieu-de-tai-hien">Tái hiện</h2>
      </div>
      {ds.map((t, i) => (
        <figure key={t.id} className="cap-tai-hien">
          <div className="hai-anh-tai-hien">
            <div>
              <KhungTaiHien url={t.xuaUrl} nhan={t.nhanXua} kieu="xua" onMo={() => setPhong({ cap: i, viTri: 0 })} />
              <span className="nam-tai-hien">{t.namXua ?? 'Ngày ấy'}</span>
            </div>
            <div>
              <KhungTaiHien url={t.nayUrl} nhan={t.nhanNay} kieu="nay" onMo={() => setPhong({ cap: i, viTri: 1 })} />
              <span className="nam-tai-hien">{t.namNay ?? 'Bây giờ'}</span>
            </div>
          </div>
          {t.chuThich && <figcaption>{t.chuThich}</figcaption>}
        </figure>
      ))}
      {phong && <PhongTo ds={anhCap(ds[phong.cap])} viTri={phong.viTri} dong={() => setPhong(null)} />}
    </section>
  )
}

/** Góc thầy cô */
export function GocThayCo({ ds }: { ds: ThayCo[] }) {
  if (!ds.length) return null
  return (
    <section className="muc khung" aria-labelledby="tieu-de-thay-co">
      <div className="muc-dau">
        <span className="tieu-de-phu">Những người đưa đò</span>
        <h2 className="tieu-de" id="tieu-de-thay-co">Góc thầy cô</h2>
      </div>
      <div className="ds-thay-co">
        {ds.map((c) => {
          const phu = [c.vaiTro, c.mon && `dạy ${c.mon}`].filter(Boolean).join(' · ')
          return (
            <article key={c.id} className="the the-thay-co">
              <div className="khung-anh nay anh-thay-co">{c.anhUrl ? <img src={c.anhUrl} alt={`Ảnh ${c.hoTen}`} loading="lazy" /> : <IconNguoi />}</div>
              <div className="tt-thay-co">
                <strong>{c.hoTen}</strong>
                {phu && <span className="chu-mo">{phu}</span>}
                {c.cauNoi && <p className="cau-thay-co">“{c.cauNoi}”</p>}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
