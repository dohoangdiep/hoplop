/** Tạo lớp mới (quản trị chung). */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { taoLop, themLopTruong, homNay, congThang, type LopQuanTri, type KetQuaThemLT } from '../../lib/quanTri'
import type { CapHoc } from '../../lib/guiAnh'
import type { MaGiaoDien } from '../../themes'
import { ChonCapHoc, ChonGiaoDien, MaQR, SaoChep, TheTinNhanPin, linkLop, ngayVN } from './chung'

export default function TaoLop() {
  const dieuHuong = useNavigate()
  const [tenLop, setTenLop] = useState('')
  const [truong, setTruong] = useState('')
  const [tinh, setTinh] = useState('')
  const [bd, setBd] = useState('')
  const [kt, setKt] = useState('')
  const [gd, setGd] = useState<MaGiaoDien>('hoai-niem')
  const [cap, setCap] = useState<CapHoc>('thpt')
  const [han, setHan] = useState(() => congThang(homNay(), 12))
  const [dang, setDang] = useState(false)
  const [loi, setLoi] = useState('')
  const [lt, setLt] = useState([{ hoTen: '', sdt: '' }, { hoTen: '', sdt: '' }])
  const [ketQua, setKetQua] = useState<{ lop: LopQuanTri; matKhau: string; lopTruong: { hoTen: string; kq: KetQuaThemLT }[]; loiLt: string[] } | null>(null)
  const doiLt = (i: number, k: 'hoTen' | 'sdt', v: string) => setLt(lt.map((x, j) => (j === i ? { ...x, [k]: v } : x)))

  const gui = async (e: FormEvent) => {
    e.preventDefault()
    setLoi('')
    const dsLt = lt.filter((x) => x.hoTen.trim() || x.sdt.trim())
    if (dsLt.some((x) => !x.hoTen.trim() || !x.sdt.trim())) { setLoi('Lớp trưởng cần đủ cả họ tên và số điện thoại (hoặc để trống cả hai).'); return }
    setDang(true)
    try {
      const r = await taoLop({
        tenLop, truong, tinh, giaoDien: gd, cap, hetHan: han || null,
        nienKhoaBatDau: bd ? Number(bd) : null,
        nienKhoaKetThuc: kt ? Number(kt) : null,
      })
      const lopTruong: { hoTen: string; kq: KetQuaThemLT }[] = []
      const loiLt: string[] = []
      for (const x of dsLt) {
        try { lopTruong.push({ hoTen: x.hoTen.trim(), kq: await themLopTruong(r.lop.id, x.hoTen, x.sdt) }) }
        catch (er) { loiLt.push(`${x.hoTen}: ${(er as Error).message}`) }
      }
      setKetQua({ ...r, lopTruong, loiLt })
    } catch (e) {
      setLoi((e as Error).message)
    } finally { setDang(false) }
  }

  if (ketQua) {
    const url = linkLop(ketQua.lop.ma)
    const tinNhan = `Trang kỷ niệm lớp ${ketQua.lop.ten_lop} · ${ketQua.lop.truong}\nLink cho cả lớp (bấm là vào, không cần mật khẩu): ${url}`
    return (
      <main className="qt-khung qt-hep">
        <h1>Đã tạo lớp {ketQua.lop.ten_lop}</h1>
        <dl className="qt-tt">
          <dt>Hạn dùng</dt><dd>{ketQua.lop.het_han ? ngayVN(ketQua.lop.het_han) : 'Không đặt hạn'}</dd>
          <dt>Mã lớp</dt><dd><code>{ketQua.lop.ma}</code></dd>
          <dt>Link</dt><dd><a href={url}>{url}</a></dd>
          <dt>Mật khẩu lớp</dt><dd><code>{ketQua.matKhau}</code></dd>
        </dl>
        <p className="qt-mo">Mật khẩu lớp chỉ cần khi vào bằng tên gọi hoặc khi bật “Luôn cần mật khẩu”. Hệ thống chỉ lưu dạng mã hóa, không xem lại được (chỉ đặt lại được).</p>

        <h2>Lớp trưởng</h2>
        {ketQua.lopTruong.length === 0 && !ketQua.loiLt.length && <p className="qt-mo">Chưa thêm lớp trưởng. Thêm sau ở trang quản lý lớp.</p>}
        <div className="qt-form">
          {ketQua.lopTruong.map((x) => <TheTinNhanPin key={x.kq.id} lop={ketQua.lop} hoTen={x.hoTen} kq={x.kq} />)}
        </div>
        {ketQua.loiLt.map((l) => <p key={l} className="qt-loi" role="alert">{l}</p>)}

        <h2 style={{ marginTop: 20 }}>Link cho cả lớp</h2>
        <div className="qt-hang">
          <SaoChep text={tinNhan} nhan="Chép tin nhắn gửi nhóm Zalo lớp" />
          <button className="qt-nut" onClick={() => dieuHuong(`/quan-tri/lop/${ketQua.lop.id}/thanh-vien`)}>Dựng trang lớp: nhập thành viên</button>
        </div>
        <MaQR url={url} tenFile={`qr-lop-${ketQua.lop.ma}.png`} />
      </main>
    )
  }

  return (
    <main className="qt-khung qt-hep">
      <nav className="qt-vet" aria-label="Vị trí"><Link to="/quan-tri">Các lớp</Link><span aria-hidden="true">/</span><span>Tạo lớp mới</span></nav>
      <h1>Tạo lớp mới</h1>
      <form onSubmit={gui} className="qt-form">
        <h2 className="qt-h-nhom">Thông tin lớp</h2>
        <label htmlFor="ten-lop">Tên lớp</label>
        <input id="ten-lop" required placeholder="12A1" value={tenLop} onChange={(e) => setTenLop(e.target.value)} />
        <label htmlFor="truong">Trường</label>
        <input id="truong" required placeholder="THPT Thanh Miện 2" value={truong} onChange={(e) => setTruong(e.target.value)} />
        <label htmlFor="tinh">Tỉnh / thành</label>
        <input id="tinh" placeholder="Hải Dương" value={tinh} onChange={(e) => setTinh(e.target.value)} />
        <div className="qt-hai-cot">
          <div><label htmlFor="bd">Năm vào trường</label><input id="bd" inputMode="numeric" placeholder="2003" value={bd} onChange={(e) => setBd(e.target.value.replace(/\D/g, ''))} /></div>
          <div><label htmlFor="kt">Năm ra trường</label><input id="kt" inputMode="numeric" placeholder="2006" value={kt} onChange={(e) => setKt(e.target.value.replace(/\D/g, ''))} /></div>
        </div>
        <ChonCapHoc value={cap} onChange={setCap} />
        <h2 className="qt-h-nhom">Hạn dùng</h2>
        <label htmlFor="han-dung">Dùng đến ngày</label>
        <input id="han-dung" type="date" value={han} onChange={(e) => setHan(e.target.value)} />
        <p className="qt-mo qt-nho" style={{ margin: 0 }}>Mặc định 1 năm kể từ hôm nay (gói năm đầu). Để trống nếu không đặt hạn. Đổi được sau ở danh sách lớp.</p>
        <h2 className="qt-h-nhom">Giao diện</h2>
        <ChonGiaoDien value={gd} onChange={setGd} />
        <h2 className="qt-h-nhom">Lớp trưởng</h2>
        <fieldset className="qt-fieldset">
          <legend>Tối đa 2 người (trưởng + phó), có thể thêm sau</legend>
          {lt.map((x, i) => (
            <div className="qt-hai-cot" key={i}>
              <div><label htmlFor={`lt-ten-${i}`}>{i === 0 ? 'Lớp trưởng' : 'Lớp phó (không bắt buộc)'}</label>
                <input id={`lt-ten-${i}`} value={x.hoTen} onChange={(e) => doiLt(i, 'hoTen', e.target.value)} placeholder="Họ tên" /></div>
              <div><label htmlFor={`lt-sdt-${i}`}>Số điện thoại</label>
                <input id={`lt-sdt-${i}`} type="tel" inputMode="tel" value={x.sdt} onChange={(e) => doiLt(i, 'sdt', e.target.value)} placeholder="0912 345 678" /></div>
            </div>
          ))}
          <p className="qt-mo" style={{ fontSize: 13, margin: '8px 0 0' }}>Hệ thống sinh mã PIN 6 số và soạn sẵn tin nhắn Zalo để bạn gửi riêng.</p>
        </fieldset>
        <button className="qt-nut chinh" disabled={dang}>{dang ? 'Đang tạo…' : 'Tạo lớp'}</button>
      </form>
      {loi && <p className="qt-loi" role="alert">{loi}</p>}
    </main>
  )
}

