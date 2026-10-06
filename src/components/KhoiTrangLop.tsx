import { useMemo, useState } from 'react'
import type { Lop } from '../lib/types'
import type { KieuBia } from '../themes'

const IconAnh = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="M21 16l-5-5-9 9" />
  </svg>
)

const homNay = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** Buổi họp đã diễn ra (hoặc đang diễn ra hôm nay), hay đã có ảnh thì coi như đã có chương. */
const daCoChuong = (c: Lop['chuong'][number]) =>
  !c.sapToi || !c.ngay || c.ngay <= homNay() || !!c.soAnh || !!c.anhTapTheUrl

function AnhBia({ lop }: { lop: Lop }) {
  return lop.anhBiaUrl ? (
    <div className="khung-anh xua"><img src={lop.anhBiaUrl} alt={`Ảnh tập thể lớp ${lop.tenLop}`} /></div>
  ) : (
    <div className="khung-anh xua" style={{ flexDirection: 'column', gap: 8 }}>
      <IconAnh />
      <span>[Ảnh tập thể ngày bế giảng]</span>
    </div>
  )
}

export function Bia({ lop, kieu }: { lop: Lop; kieu: KieuBia }) {
  const soNam = lop.nienKhoaKetThuc ? new Date().getFullYear() - lop.nienKhoaKetThuc : 0
  const soLanHop = lop.chuong.filter(daCoChuong).length
  const nienKhoa = `${lop.nienKhoaBatDau} – ${lop.nienKhoaKetThuc}`

  const soLieu = (
    <div className="so-lieu">
      <div><b>{soNam}</b><span>năm ra trường</span></div>
      <div><b>{soLanHop}</b><span>lần gặp lại</span></div>
      <div><b>{lop.soAnhDaLuu.toLocaleString('vi-VN')}</b><span>ảnh đã lưu</span></div>
    </div>
  )

  if (kieu === 'khoi-mau')
    return (
      <header className="bia-khoi-mau">
        <div className="khoi">
          <span className="phu">{lop.truong} · {nienKhoa}</span>
          <span className="tieu-de-phu" style={{ color: 'var(--mau-sticker)' }}>Thanh xuân của</span>
          <h1 className="ten-lop">Lớp {lop.tenLop}</h1>
        </div>
        <div className="anh-bia">
          <AnhBia lop={lop} />
          <div className="nhan-dan" aria-hidden="true"><b>{soNam}</b><span>năm rồi!</span></div>
        </div>
        {soLieu}
      </header>
    )

  if (kieu === 'tran-khung')
    return (
      <header className="bia-tran-khung">
        <div className="anh-lon">
          <AnhBia lop={lop} />
          <div className="dai-chu">
            <span className="phu">{lop.truong} · {nienKhoa}</span>
            <h1 className="ten-lop">Lớp {lop.tenLop}</h1>
            <span className="tieu-de-phu" style={{ color: '#E8E4DA' }}>{soNam} năm, vẫn là chúng ta.</span>
          </div>
        </div>
        <div className="the" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0 }}>{soLieu}</div>
      </header>
    )

  return (
    <header className="bia-polaroid">
      <span className="chu-mo">{lop.truong} · Trang riêng của lớp</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="tieu-de-phu" style={{ fontSize: 30 }}>Thanh xuân của</span>
        <h1 className="ten-lop">Lớp {lop.tenLop}</h1>
        <span className="chu-mo" style={{ fontSize: 14 }}>Niên khóa {nienKhoa}</span>
      </div>
      <div className="polaroid">
        <AnhBia lop={lop} />
        <span className="chu-tay">Ngày bế giảng, {lop.nienKhoaKetThuc}</span>
      </div>
      {soLieu}
    </header>
  )
}

export function SapHopLop({ lop }: { lop: Lop }) {
  // Buổi gần nhất từ hôm nay trở đi
  const sap = lop.chuong.filter((c) => c.ngay && c.ngay >= homNay()).sort((a, b) => a.ngay.localeCompare(b.ngay))[0]
  if (!sap) return null
  const conNgay = Math.round((new Date(sap.ngay + 'T00:00:00').getTime() - new Date(homNay() + 'T00:00:00').getTime()) / 86400000)
  return (
    <section className="sap-hop" aria-label="Buổi họp lớp sắp tới">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="nhan">Sắp họp lớp</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{conNgay > 0 ? `Còn ${conNgay} ngày` : 'Hôm nay!'}</span>
      </div>
      <div className="ten">{sap.tieuDe}</div>
      {sap.diaDiem && <div style={{ fontSize: 13, color: 'var(--mau-on-primary-muted)' }}>{sap.diaDiem}</div>}
      <div className="nut-hang">
        <a className="nut trang" href={`/${lop.ma}/gui-anh`}>Gửi ảnh cho lớp</a>
        <a className="nut vien" href="#thu">Viết thư cho lớp</a>
      </div>
    </section>
  )
}

export function SoDoChoNgoi({ lop }: { lop: Lop }) {
  const { soDay, soBanMoiDay, choMoiBan, choNgoi } = lop.soDo
  const tvTheoId = useMemo(() => new Map(lop.thanhVien.map((t) => [t.id, t])), [lop.thanhVien])
  const [chon, setChon] = useState<string | null>(
    choNgoi.find((c) => c.thanhVienId && tvTheoId.has(c.thanhVienId))?.thanhVienId ?? lop.thanhVien[0]?.id ?? null,
  )
  if (!soDay || !lop.thanhVien.length) return null
  const dangChon = chon ? tvTheoId.get(chon) : undefined

  const timCho = (day: number, ban: number, viTri: number) =>
    choNgoi.find((c) => c.day === day && c.ban === ban && c.viTri === viTri)

  return (
    <section className="muc khung">
      <div className="muc-dau">
        <span className="tieu-de-phu">Ngày ấy mình ngồi đâu?</span>
        <h2 className="tieu-de">Sơ đồ lớp {lop.tenLop}</h2>
        <span className="chu-mo">Chạm vào một chỗ ngồi để xem bạn ấy ngày ấy và bây giờ.</span>
      </div>
      <div className="the so-do">
        <div className="bang-den">Bảng đen · Bàn giáo viên</div>
        {Array.from({ length: soDay }, (_, day) => (
          <div key={day} className="day-ban" style={{ gridTemplateColumns: `repeat(${soBanMoiDay}, minmax(0, 1fr))` }}>
            {Array.from({ length: soBanMoiDay }, (_, ban) => (
              <div key={ban} className="ban" style={{ gridTemplateColumns: `repeat(${choMoiBan}, minmax(0, 1fr))` }}>
                {Array.from({ length: choMoiBan }, (_, viTri) => {
                  const tv = timCho(day, ban, viTri)?.thanhVienId
                  const nguoi = tv ? tvTheoId.get(tv) : undefined
                  return (
                    <button
                      key={viTri}
                      type="button"
                      className="cho"
                      disabled={!nguoi}
                      aria-pressed={!!nguoi && chon === nguoi.id}
                      aria-label={nguoi ? nguoi.hoTen : 'Chỗ trống'}
                      onClick={() => nguoi && setChon(nguoi.id)}
                    >
                      {nguoi?.tenGoiTat ?? ''}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
      {dangChon && (
        <div className="the ho-so" aria-live="polite">
          <div className="hai-anh">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="khung-anh xua">{dangChon.anhXuaUrl ? <img src={dangChon.anhXuaUrl} alt={`${dangChon.hoTen} ngày ấy`} /> : <IconAnh />}</div>
              <span className="chu-mo" style={{ textAlign: 'center' }}>Ngày ấy</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="khung-anh nay">{dangChon.anhNayUrl ? <img src={dangChon.anhNayUrl} alt={`${dangChon.hoTen} bây giờ`} /> : <IconAnh />}</div>
              <span className="chu-mo" style={{ textAlign: 'center' }}>Bây giờ</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="ten">{dangChon.hoTen}</span>
            <span className="chu-mo">
              {dangChon.bietDanh && <>Biệt danh: <strong style={{ color: 'var(--mau-accent)' }}>{dangChon.bietDanh}</strong></>}
              {dangChon.noiO && <> · Đang ở {dangChon.noiO}</>}
            </span>
          </div>
          {dangChon.cauLuuBut && <div className="loi">“{dangChon.cauLuuBut}”</div>}
        </div>
      )}
    </section>
  )
}

export function KhoAnhXua({ lop }: { lop: Lop }) {
  const [tab, setTab] = useState(0)
  const [phong, setPhong] = useState<number | null>(null)
  const muc = lop.khoAnhXua[Math.min(tab, lop.khoAnhXua.length - 1)]
  return (
    <section className="muc khung">
      <div className="muc-dau">
        <span className="tieu-de-phu">Ai còn giữ ảnh thì gửi nhé</span>
        <h2 className="tieu-de">Kho ảnh xưa</h2>
      </div>
      {muc ? (
        <>
          <div className="tab-hang" role="group" aria-label="Chọn mục ảnh">
            {lop.khoAnhXua.map((m, i) => (
              <button key={m.ma} type="button" className="tab" aria-pressed={m === muc} onClick={() => { setTab(i); setPhong(null) }}>
                {m.ten} ({m.anh.length})
              </button>
            ))}
          </div>
          <div className="luoi-anh">
            {muc.anh.map((a, j) => (
              <figure key={a.id}>
                {a.url ? (
                  <button type="button" className="khung-anh xua nut-anh" onClick={() => setPhong(j)} aria-label={`Xem lớn${a.chuThich ? ': ' + a.chuThich : ''}`}>
                    <img src={a.url} alt="" loading="lazy" />
                  </button>
                ) : (
                  <div className="khung-anh xua"><IconAnh /></div>
                )}
                {a.chuThich && <figcaption>{a.chuThich}</figcaption>}
              </figure>
            ))}
          </div>
        </>
      ) : (
        <p className="chu-mo" style={{ fontSize: 15, margin: 0 }}>Chưa có ảnh xưa nào. Bạn nào còn giữ ảnh thì gửi lên đầu tiên nhé!</p>
      )}
      <a className="nut-gui" href={`/${lop.ma}/gui-anh`}>Gửi thêm ảnh cho lớp</a>
      {phong !== null && <PhongTo ds={muc?.anh ?? []} viTri={phong} dong={() => setPhong(null)} />}
    </section>
  )
}

/** Xem ảnh lớn, có nút lùi/tiến khi xem cả album. */
export function PhongTo({ ds, viTri, dong }: { ds: { url?: string; chuThich: string }[]; viTri: number; dong: () => void }) {
  const [i, setI] = useState(viTri)
  const a = ds[i]
  if (!a?.url) return null
  const sang = (b: number) => (e: React.MouseEvent) => { e.stopPropagation(); setI((i + b + ds.length) % ds.length) }
  return (
    <div className="phong-to" role="dialog" aria-modal="true" aria-label="Ảnh phóng to" onClick={dong}>
      <img src={a.url} alt={a.chuThich} onClick={(e) => e.stopPropagation()} />
      {a.chuThich && <p>{a.chuThich}</p>}
      <div className="phong-to-nut">
        {ds.length > 1 && <button type="button" className="nut vien-trang" onClick={sang(-1)} aria-label="Ảnh trước">‹</button>}
        <button type="button" className="nut trang" onClick={dong}>Đóng</button>
        {ds.length > 1 && <button type="button" className="nut vien-trang" onClick={sang(1)} aria-label="Ảnh sau">›</button>}
      </div>
      {ds.length > 1 && <span className="phong-to-so">{i + 1} / {ds.length}</span>}
    </div>
  )
}

const ngayVN = (ngay: string) => {
  const d = new Date(ngay)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

const SO_ANH_THU_GON = 6

function MotLanHop({ c, maLop }: { c: Lop['chuong'][number]; maLop: string }) {
  const [moHet, setMoHet] = useState(false)
  const [phong, setPhong] = useState<number | null>(null)
  const album = (c.anh ?? []).filter((a) => a.url)
  const ds = [...(c.anhTapTheUrl ? [{ url: c.anhTapTheUrl, chuThich: `Ảnh tập thể · ${c.tieuDe}` }] : []), ...album]
  const lech = c.anhTapTheUrl ? 1 : 0
  const hien = moHet ? album : album.slice(0, SO_ANH_THU_GON)
  const conLai = album.length - hien.length
  return (
    <div className="moc">
      <div className="nam"><b>{c.ngay.slice(0, 4)}</b><i /></div>
      <div className="noi-dung">
        <strong>{c.tieuDe}</strong>
        <span className="chu-mo">
          {[ngayVN(c.ngay), c.diaDiem, c.soAnh && `${c.soAnh} ảnh`].filter(Boolean).join(' · ')}
        </span>
        {c.moTa && <p className="mo-ta-chuong">{c.moTa}</p>}
        {c.anhTapTheUrl && (
          <button type="button" className="khung-anh nay nut-anh anh-tap-the" onClick={() => setPhong(0)} aria-label={`Xem lớn ảnh tập thể ${c.tieuDe}`}>
            <img src={c.anhTapTheUrl} alt="" loading="lazy" />
          </button>
        )}
        {hien.length > 0 && (
          <div className="luoi-anh">
            {hien.map((a, j) => (
              <button key={a.id} type="button" className="khung-anh xua nut-anh" onClick={() => setPhong(j + lech)}
                aria-label={`Xem lớn${a.chuThich ? ': ' + a.chuThich : ''}`}>
                <img src={a.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {conLai > 0 && (
          <button type="button" className="nut-gui" onClick={() => setMoHet(true)}>Xem thêm {conLai} ảnh</button>
        )}
        {!c.anhTapTheUrl && !album.length && (c.soAnh ? (
          <div className="luoi-anh" aria-hidden="true">
            {[0, 1, 2].map((k) => <div key={k} className="khung-anh xua"><IconAnh /></div>)}
          </div>
        ) : <span className="chu-mo">Chưa có ảnh buổi này.</span>)}
        {c.videoUrl && (
          <a className="nut-gui" href={c.videoUrl} target="_blank" rel="noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5 3.5-5 3.5z" /></svg>
            Xem video buổi họp
          </a>
        )}
        {maLop !== 'xemmau' && <a className="nut-gui" href={`/${maLop}/gui-anh?buoi=${c.id}`}>Gửi ảnh buổi này</a>}
      </div>
      {phong !== null && <PhongTo ds={ds} viTri={phong} dong={() => setPhong(null)} />}
    </div>
  )
}

export function DongThoiGian({ lop }: { lop: Lop }) {
  const ds = lop.chuong.filter(daCoChuong)
  if (!ds.length) return null
  return (
    <section className="muc khung">
      <div className="muc-dau">
        <span className="tieu-de-phu">Mỗi năm thêm một chương</span>
        <h2 className="tieu-de">Những lần gặp lại</h2>
      </div>
      <div className="dong-tg">
        {ds.map((c) => <MotLanHop key={c.id} c={c} maLop={lop.ma} />)}
      </div>
    </section>
  )
}

/** Ảnh tập thể các năm đặt cạnh nhau. Lấy cả ảnh bìa (ngày ra trường) làm mốc đầu tiên. */
export function NamNayNamNgoai({ lop }: { lop: Lop }) {
  const moc = [
    ...lop.chuong.filter((c) => c.anhTapTheUrl)
      .map((c) => ({ khoa: c.id, nam: c.ngay.slice(0, 4), nhan: c.tieuDe, url: c.anhTapTheUrl! })),
    ...(lop.anhBiaUrl ? [{ khoa: 'bia', nam: String(lop.nienKhoaKetThuc || ''), nhan: 'Ngày ra trường', url: lop.anhBiaUrl }] : []),
  ]
  const [chon, setChon] = useState(1)
  const [phong, setPhong] = useState<number | null>(null)
  if (moc.length < 2) return null
  const moi = moc[0]
  const cu = moc[Math.min(chon, moc.length - 1)]
  const hai = [cu, moi]
  return (
    <section className="muc khung">
      <div className="muc-dau">
        <span className="tieu-de-phu">Mình đã khác chưa?</span>
        <h2 className="tieu-de">Năm nay – năm ngoái</h2>
      </div>
      {moc.length > 2 && (
        <div className="tab-hang" role="group" aria-label="So với năm">
          <span className="chu-mo" style={{ alignSelf: 'center', fontSize: 13 }}>So với:</span>
          {moc.slice(1).map((m, j) => (
            <button key={m.khoa} type="button" className="tab" aria-pressed={cu === m} onClick={() => setChon(j + 1)}>{m.nam || m.nhan}</button>
          ))}
        </div>
      )}
      <div className="so-sanh">
        {hai.map((m, j) => (
          <figure key={m.khoa}>
            <button type="button" className={`khung-anh ${j ? 'nay' : 'xua'} nut-anh`} onClick={() => setPhong(j)} aria-label={`Xem lớn ảnh ${m.nhan}`}>
              <img src={m.url} alt="" loading="lazy" />
            </button>
            <figcaption><b>{m.nam}</b> · {m.nhan}</figcaption>
          </figure>
        ))}
      </div>
      {phong !== null && (
        <PhongTo ds={hai.map((m) => ({ url: m.url, chuThich: `${m.nam} · ${m.nhan}` }))} viTri={phong} dong={() => setPhong(null)} />
      )}
    </section>
  )
}
