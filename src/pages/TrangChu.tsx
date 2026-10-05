import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MA_LOP_MAU } from '../data/lopMau'
import { laMaLopHopLe, laTenGoiHopLe } from '../lib/maLop'
import { DANH_SACH_GIAO_DIEN, GIAO_DIEN } from '../themes'
import {
  LIEN_HE, zaloLink, TINH_NANG, ZALO_SO_VOI_TRANG, BUOC, GOI, CAM_NHAN, HOI_DAP, BAN_MINH_HOA,
  type MaTinhNang,
} from '../data/trangChu'
import '../styles/trangchu.css'

const ANH = (ten: string) => `/trang-chu/${ten}`

/** Lấy mã lớp từ chữ khách gõ: chấp nhận cả mã trần lẫn link dán vào (…/k7m2pa/gui-anh). */
function tachMaLop(vao: string): string {
  let s = vao.trim().toLowerCase()
  if (s.includes('/')) {
    try {
      const u = new URL(s.includes('://') ? s : `https://${s}`)
      s = u.pathname.split('/').filter(Boolean)[0] ?? ''
    } catch {
      s = s.split('/').filter(Boolean).pop() ?? ''
    }
  }
  return s.replace(/\s+/g, '')
}

/* ---------- Icon nét ---------- */
const IconZalo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
)
const IconKhien = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>
)
const IconChon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
)
const IconMuiTen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

/** Nút "Nhắn Zalo": có số thì mở Zalo, chưa có thì hiện chỗ trống [số điện thoại]. */
function NutZalo({ className, chu }: { className: string; chu: string }) {
  const link = zaloLink()
  const nhan = LIEN_HE.zalo ? `${chu} ${LIEN_HE.zalo}` : `${chu} [số điện thoại]`
  if (!link) return <a className={className} href="#dat-trang"><IconZalo />{nhan}</a>
  return <a className={className} href={link} target="_blank" rel="noopener noreferrer"><IconZalo />{nhan}</a>
}

/* ---------- Thẻ minh họa đầu trang: bấm chỗ ngồi đổi bạn ---------- */
function TheMinhHoa() {
  const [chon, setChon] = useState(3)
  const b = BAN_MINH_HOA[chon]
  const ban = [BAN_MINH_HOA.slice(0, 2), BAN_MINH_HOA.slice(2, 4), BAN_MINH_HOA.slice(4, 6)]
  return (
    <div className="tc-the-mh">
      <div className="tc-the-mh-dau">
        <span className="tc-the-mh-lop">Lớp 12A1</span>
        <span className="tc-nho">Khóa 2003 – 2006</span>
      </div>
      <div className="tc-bang-den" aria-hidden="true">Bảng đen</div>
      <div className="tc-day-ban" role="group" aria-label="Chọn một bạn trong sơ đồ">
        {ban.map((cap, i) => (
          <div className="tc-ban" key={i}>
            {cap.map((x, j) => {
              const so = i * 2 + j
              return (
                <button key={x.ten} type="button" className="tc-cho" aria-pressed={so === chon} onClick={() => setChon(so)}>
                  {x.ten}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="tc-hai-anh">
        <figure>
          <img src={ANH(`${b.anh}-xua.jpg`)} alt={`${b.ten} ngày ấy (ảnh vẽ minh họa)`} width={180} height={180} />
          <figcaption>Ngày ấy</figcaption>
        </figure>
        <figure>
          <img src={ANH(`${b.anh}-nay.jpg`)} alt={`${b.ten} bây giờ (ảnh vẽ minh họa)`} width={180} height={180} />
          <figcaption>Bây giờ</figcaption>
        </figure>
      </div>
      <p className="tc-luu-but" aria-live="polite">“{b.bietDanh}” · {b.luuBut}</p>
      <span className="tc-goi-y">Chạm vào một chỗ ngồi để đổi bạn</span>
    </div>
  )
}

/* ---------- Minh họa cho từng tính năng ---------- */
function MaQrLopMau() {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let huy = false
    import('qrcode').then((qr) =>
      qr.toString(`${window.location.origin}/${MA_LOP_MAU}`, { type: 'svg', margin: 0, color: { dark: '#22203A', light: '#0000' } }),
    ).then((s) => { if (!huy) setSvg(s) }).catch(() => {})
    return () => { huy = true }
  }, [])
  return <div className="tc-qr" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
}

function MinhHoa({ ma }: { ma: MaTinhNang }): ReactNode {
  switch (ma) {
    case 'so-do':
      return (
        <div className="tc-mh tc-mh-so-do" aria-hidden="true">
          <span className="tc-mh-bang" />
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="tc-mh-ban"><i className={i === 4 ? 'chon' : ''} /><i /></span>
          ))}
        </div>
      )
    case 'kho-anh':
      return (
        <div className="tc-mh tc-mh-chong" aria-hidden="true">
          <img src={ANH('cam-trai.jpg')} alt="" loading="lazy" />
          <img src={ANH('kho-anh-xua.jpg')} alt="" loading="lazy" />
        </div>
      )
    case 'gap-lai':
      return (
        <div className="tc-mh tc-mh-chuong" aria-hidden="true">
          <img src={ANH('hop-lop.jpg')} alt="" loading="lazy" />
          <span>Chương 3 · Tết 2026</span>
        </div>
      )
    case 'nam-nay':
      return (
        <div className="tc-mh tc-mh-doi" aria-hidden="true">
          <figure><img src={ANH('be-giang.jpg')} alt="" loading="lazy" /><figcaption>2006</figcaption></figure>
          <figure><img src={ANH('hop-lop.jpg')} alt="" loading="lazy" /><figcaption>2026</figcaption></figure>
        </div>
      )
    case 'qr':
      return (
        <div className="tc-mh tc-mh-qr">
          <MaQrLopMau />
          <span>Quét thử bằng điện thoại:<br />mở lớp mẫu</span>
        </div>
      )
    case 'hop-thu':
      return (
        <div className="tc-mh tc-mh-thu" aria-hidden="true">
          <svg viewBox="0 0 120 80" width="120" height="80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
            <rect x="4" y="8" width="112" height="68" rx="6" />
            <path d="M4 14l56 36 56-36" />
          </svg>
          <span>Mở vào: Họp lớp 25 năm</span>
        </div>
      )
  }
}

export default function TrangChu() {
  const [ma, setMa] = useState('')
  const [loi, setLoi] = useState('')
  const dieuHuong = useNavigate()

  useEffect(() => { document.title = 'thanhxuan.vn – Trang kỷ niệm họp lớp' }, [])

  const vaoLop = (e: FormEvent) => {
    e.preventDefault()
    const k = tachMaLop(ma)
    if (!k) { setLoi('Bạn nhập mã lớp in trên thư mời nhé.'); return }
    if (!laMaLopHopLe(k) && !laTenGoiHopLe(k)) {
      setLoi('Mã lớp gồm 6 chữ và số, ví dụ k7m2pa. Bạn kiểm tra lại giúp nhé.')
      return
    }
    setLoi('')
    dieuHuong(`/${k}`)
  }

  const chanTrang = ['© thanhxuan.vn', LIEN_HE.tenHoKinhDoanh || '[Tên hộ kinh doanh]', LIEN_HE.diaChi || '[Địa chỉ]']

  return (
    <div className="tc">
      <a className="tc-bo-qua" href="#noi-dung">Bỏ qua thanh điều hướng</a>
      <nav className="tc-nav" aria-label="Điều hướng chính">
        <div className="tc-khung tc-nav-trong">
          <Link to="/" className="tc-logo" aria-label="thanhxuan.vn, trang chủ"><span>thanh xuân</span><b>.vn</b></Link>
          <div className="tc-nav-link">
            <a className="an-tren-dt" href="#tinh-nang">Có gì trong trang</a>
            <a className="an-tren-dt" href="#bang-gia">Bảng giá</a>
            <a href="#vao-lop">Vào lớp</a>
            <a className="tc-nut-nho" href="#dat-trang">Đặt trang</a>
          </div>
        </div>
      </nav>

      <main id="noi-dung">
        <header className="tc-khung tc-hero">
          <div className="tc-hero-chu">
            <span className="tc-chu-tay">Trang kỷ niệm cho lớp mình</span>
            <h1>Giữ lại thanh xuân của lớp mình. Mỗi lần họp lớp, thêm một chương.</h1>
            <p>Sơ đồ chỗ ngồi ngày ấy, kho ảnh xưa cả lớp cùng góp, ảnh từng lần gặp lại và những lá thư hẹn mở năm sau. Tất cả trên một trang riêng, chỉ lớp mình xem được.</p>
            <div className="tc-hang-nut">
              <Link className="tc-nut do" to={`/${MA_LOP_MAU}`}>Xem lớp mẫu <IconMuiTen /></Link>
              <NutZalo className="tc-nut vien" chu="Nhắn Zalo đặt trang" />
            </div>
            <span className="tc-mo">Khoảng 30.000đ mỗi bạn cho lớp 50 người · Nhận trang sau 7–10 ngày</span>
          </div>
          <div className="tc-hero-hinh">
            <TheMinhHoa />
          </div>
        </header>

        <section className="tc-vao-lop" id="vao-lop" aria-labelledby="tieu-de-vao-lop">
          <form className="tc-khung tc-vao-lop-trong" onSubmit={vaoLop} noValidate>
            <div className="tc-vao-lop-chu">
              <h2 id="tieu-de-vao-lop">Vào trang lớp của bạn</h2>
              <span>Mất link hoặc không quét được QR? Nhập mã lớp in trên thư mời.</span>
            </div>
            <div className="tc-vao-lop-o">
              <div className="tc-o-nhap">
                <label htmlFor="ma-lop" className="an-di">Mã lớp</label>
                <input
                  id="ma-lop" value={ma} placeholder="Mã lớp, ví dụ k7m2pa"
                  onChange={(e) => { setMa(e.target.value); if (loi) setLoi('') }}
                  autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="go"
                  aria-invalid={!!loi} aria-describedby={loi ? 'loi-ma-lop' : undefined}
                />
                <button type="submit">Vào lớp</button>
              </div>
              {loi && <p id="loi-ma-lop" className="tc-loi" role="alert">{loi}</p>}
            </div>
          </form>
        </section>

        <section id="tinh-nang" className="tc-khung tc-muc" aria-labelledby="tieu-de-tinh-nang">
          <div className="tc-dau-muc">
            <span className="tc-chu-tay nho">Mở ra là nhớ</span>
            <h2 id="tieu-de-tinh-nang">Có gì trong trang của lớp</h2>
          </div>
          <div className="tc-luoi">
            {TINH_NANG.map((f) => (
              <article key={f.ma} className="tc-tinh-nang">
                <MinhHoa ma={f.ma} />
                <h3>{f.tieuDe}{f.sapCo && <span className="tc-nhan">Sắp có</span>}</h3>
                <p>{f.moTa}</p>
              </article>
            ))}
          </div>
          <p className="tc-chu-thich">Ảnh trên trang này là tranh vẽ minh họa, không phải người thật.</p>
        </section>

        <section className="tc-khung tc-muc-hep" aria-labelledby="tieu-de-zalo">
          <div className="tc-so-sanh">
            <div className="tc-so-sanh-dau">
              <h2 id="tieu-de-zalo">Ảnh năm ngoái của lớp bạn giờ ở đâu?</h2>
              <p>Nhóm Zalo rất tiện để hẹn nhau, nhưng không phải chỗ giữ kỷ niệm.</p>
            </div>
            <div className="tc-so-sanh-cot">
              <div className="tc-cot zalo">
                <h3>Trong nhóm Zalo</h3>
                <ul>{ZALO_SO_VOI_TRANG.zalo.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div className="tc-cot trang">
                <h3>Trên trang lớp</h3>
                <ul>{ZALO_SO_VOI_TRANG.trang.map((x) => <li key={x}><IconChon />{x}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        <section className="tc-khung tc-muc" aria-labelledby="tieu-de-giao-dien">
          <div className="tc-dau-muc">
            <span className="tc-chu-tay nho">Chọn kiểu cho lớp mình</span>
            <h2 id="tieu-de-giao-dien">Ba mẫu giao diện</h2>
          </div>
          <div className="tc-luoi">
            {DANH_SACH_GIAO_DIEN.map((k) => {
              const g = GIAO_DIEN[k]
              return (
                <Link key={k} className="tc-mau" to={`/${MA_LOP_MAU}?giao-dien=${k}`}>
                  <span
                    className="tc-mau-xem" aria-hidden="true"
                    style={{ background: g.mau.bg, borderRadius: g.bo.md, borderColor: g.mau.line }}
                  >
                    <b style={{ fontFamily: g.font.display, color: g.mau.ink, fontWeight: g.font.displayWeight }}>12A1</b>
                    <i style={{ fontFamily: g.font.hand, color: g.mau.accent, fontStyle: g.font.handItalic ? 'italic' : 'normal' }}>Ngày ấy</i>
                    <span className="tc-mau-dai">
                      {[g.mau.primary, g.mau.accent, g.mau.board, g.mau.sticker].map((m) => (
                        <span key={m} style={{ background: m, borderRadius: g.bo.sm }} />
                      ))}
                    </span>
                  </span>
                  <strong>{g.ten}</strong>
                  <span className="tc-mau-mo">{g.moTa}</span>
                  <span className="tc-mau-link">Xem lớp mẫu với kiểu này <IconMuiTen /></span>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="tc-khung tc-muc" aria-labelledby="tieu-de-buoc">
          <div className="tc-dau-muc">
            <span className="tc-chu-tay nho">Không cần rành công nghệ</span>
            <h2 id="tieu-de-buoc">Bốn bước, chúng tôi làm hộ</h2>
          </div>
          <ol className="tc-buoc">
            {BUOC.map((s, i) => (
              <li key={s.tieuDe}>
                <span className="tc-buoc-so" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <h3>{s.tieuDe}</h3>
                <p>{s.moTa}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="bang-gia" className="tc-gia" aria-labelledby="tieu-de-gia">
          <div className="tc-khung tc-gia-trong">
            <div className="tc-dau-muc giua">
              <span className="tc-chu-tay nho">Rẻ hơn một chiếc kỷ niệm chương</span>
              <h2 id="tieu-de-gia">Bảng giá</h2>
            </div>
            <div className="tc-luoi tc-luoi-gia">
              <div className="tc-goi">
                <h3>Năm đầu</h3>
                <div className="tc-goi-gia"><span>{GOI.namDau.gia}</span></div>
                <span className="tc-nho">{GOI.namDau.ghiChu}</span>
                <ul>{GOI.namDau.gom.map((x) => <li key={x}><IconChon />{x}</li>)}</ul>
              </div>
              <div className="tc-goi noi">
                <div className="tc-goi-dau"><h3>Mỗi năm sau</h3><span className="tc-nhan dac">Thêm một chương</span></div>
                <div className="tc-goi-gia"><span>{GOI.giaHan.gia}</span><small>/ năm</small></div>
                <span className="tc-nho">{GOI.giaHan.ghiChu}</span>
                <ul>{GOI.giaHan.gom.map((x) => <li key={x}><IconChon />{x}</li>)}</ul>
              </div>
              <div className="tc-goi">
                <h3>Thêm tùy chọn</h3>
                <dl className="tc-them">
                  {GOI.them.map(([ten, gia]) => (
                    <div key={ten}><dt>{ten}</dt><dd>{gia}</dd></div>
                  ))}
                </dl>
              </div>
            </div>
            <div className="tc-cam-ket">
              <IconKhien />
              <p><strong>Không bao giờ mất ảnh:</strong> nếu ngừng gia hạn, trang chuyển sang chỉ xem trong 6 tháng và lớp tải được toàn bộ ảnh gốc về máy.</p>
            </div>
          </div>
        </section>

        {CAM_NHAN.length > 0 && (
          <section className="tc-khung tc-muc" aria-labelledby="tieu-de-cam-nhan">
            <h2 id="tieu-de-cam-nhan">Các lớp nói gì</h2>
            <div className="tc-luoi">
              {CAM_NHAN.map((c) => (
                <blockquote key={c.lop} className="tc-cam-nhan"><p>{c.loi}</p><cite>{c.lop}</cite></blockquote>
              ))}
            </div>
          </section>
        )}

        <section className="tc-khung tc-muc" aria-labelledby="tieu-de-hoi">
          <h2 id="tieu-de-hoi">Câu hỏi thường gặp</h2>
          <div className="tc-hoi-dap">
            {HOI_DAP.map((q) => (
              <details key={q.hoi}>
                <summary>{q.hoi}</summary>
                <p>{q.dap}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="dat-trang" className="tc-dat" aria-labelledby="tieu-de-dat">
          <div className="tc-khung tc-dat-trong">
            <div className="tc-dat-chu">
              <span className="tc-chu-tay vang">Sắp họp lớp rồi?</span>
              <h2 id="tieu-de-dat">Đặt trước 2 tuần để kịp có QR cho buổi họp.</h2>
            </div>
            <div className="tc-hang-nut">
              <NutZalo className="tc-nut trang" chu="Nhắn Zalo" />
              <Link className="tc-nut vien-sang" to={`/${MA_LOP_MAU}`}>Xem lớp mẫu</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="tc-khung tc-chan">
        <span>{chanTrang.join(' · ')}</span>
        <div className="tc-chan-link">
          <Link to="/quan-tri">Quản trị</Link>
          {LIEN_HE.facebook && <a href={LIEN_HE.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>}
        </div>
      </footer>
    </div>
  )
}
