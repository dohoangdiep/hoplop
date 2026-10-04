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
  const soLanHop = lop.chuong.filter((c) => !c.sapToi).length
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
  const sap = lop.chuong.find((c) => c.sapToi)
  if (!sap) return null
  const conNgay = Math.ceil((new Date(sap.ngay).getTime() - Date.now()) / 86400000)
  return (
    <section className="sap-hop" aria-label="Buổi họp lớp sắp tới">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="nhan">Sắp họp lớp</span>
        {conNgay > 0 && <span style={{ fontSize: 13, fontWeight: 600 }}>Còn {conNgay} ngày</span>}
      </div>
      <div className="ten">{sap.tieuDe}</div>
      {sap.diaDiem && <div style={{ fontSize: 13, color: 'var(--mau-on-primary-muted)' }}>{sap.diaDiem}</div>}
      <div className="nut-hang">
        <a className="nut trang" href={`/${lop.ma}/gui-anh`}>Gửi ảnh xưa</a>
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
              <div className="khung-anh xua">[{dangChon.tenGoiTat}, {lop.nienKhoaKetThuc}]</div>
              <span className="chu-mo" style={{ textAlign: 'center' }}>Ngày ấy</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="khung-anh nay">[{dangChon.tenGoiTat}, bây giờ]</div>
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
  if (!lop.khoAnhXua.length) return null
  const muc = lop.khoAnhXua[tab]
  return (
    <section className="muc khung">
      <div className="muc-dau">
        <span className="tieu-de-phu">Ai còn giữ ảnh thì gửi nhé</span>
        <h2 className="tieu-de">Kho ảnh xưa</h2>
      </div>
      <div className="tab-hang" role="group" aria-label="Chọn mục ảnh">
        {lop.khoAnhXua.map((m, i) => (
          <button key={m.ma} type="button" className="tab" aria-pressed={i === tab} onClick={() => setTab(i)}>
            {m.ten}
          </button>
        ))}
      </div>
      <div className="luoi-anh">
        {muc.anh.map((a) => (
          <figure key={a.id}>
            <div className="khung-anh xua">{a.url ? <img src={a.url} alt={a.chuThich} /> : <IconAnh />}</div>
            <figcaption>{a.chuThich}</figcaption>
          </figure>
        ))}
      </div>
      <a className="nut-gui" href={`/${lop.ma}/gui-anh`}>Gửi thêm ảnh xưa</a>
    </section>
  )
}

export function DongThoiGian({ lop }: { lop: Lop }) {
  const ds = lop.chuong.filter((c) => !c.sapToi)
  if (!ds.length) return null
  return (
    <section className="muc khung">
      <div className="muc-dau">
        <span className="tieu-de-phu">Mỗi năm thêm một chương</span>
        <h2 className="tieu-de">Những lần gặp lại</h2>
      </div>
      <div className="dong-tg">
        {ds.map((c) => (
          <div key={c.id} className="moc">
            <div className="nam"><b>{c.ngay.slice(0, 4)}</b><i /></div>
            <div className="noi-dung">
              <strong>{c.tieuDe}</strong>
              <span className="chu-mo">
                {[c.soNguoi && `${c.soNguoi} bạn`, c.soAnh && `${c.soAnh} ảnh`].filter(Boolean).join(' · ')}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                <div className="khung-anh xua" style={{ height: 64 }} />
                <div className="khung-anh xua" style={{ height: 64 }} />
                <div className="khung-anh nay" style={{ height: 64, fontWeight: 600 }}>{c.soAnh ? `+${c.soAnh - 2}` : ''}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
