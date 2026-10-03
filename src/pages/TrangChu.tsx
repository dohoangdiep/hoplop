import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MA_LOP_MAU } from '../data/lopMau'
import { DANH_SACH_GIAO_DIEN, GIAO_DIEN } from '../themes'
import '../styles/trangchu.css'

/** Trang chủ bán hàng (bản rút gọn của mockup docs/mockup/TrangChu.dc.html). */
export default function TrangChu() {
  const [ma, setMa] = useState('')
  const dieuHuong = useNavigate()
  const vaoLop = (e: FormEvent) => {
    e.preventDefault()
    const k = ma.trim().toLowerCase()
    if (k) dieuHuong(`/${k}`)
  }

  return (
    <div className="tc">
      <nav className="tc-nav">
        <div className="tc-khung tc-nav-trong">
          <Link to="/" className="tc-logo"><span>thanh xuân</span><b>.vn</b></Link>
          <a className="tc-nut-nho" href="#dat-trang">Đặt trang</a>
        </div>
      </nav>

      <header className="tc-khung tc-hero">
        <span className="tc-chu-tay">Trang kỷ niệm cho lớp mình</span>
        <h1>Giữ lại thanh xuân của lớp mình. Mỗi lần họp lớp, thêm một chương.</h1>
        <p>Sơ đồ chỗ ngồi ngày ấy, kho ảnh xưa cả lớp cùng góp, ảnh từng lần gặp lại và những lá thư hẹn mở năm sau. Tất cả trên một trang riêng, chỉ lớp mình xem được.</p>
        <div className="tc-hang-nut">
          <Link className="tc-nut do" to={`/${MA_LOP_MAU}`}>Xem lớp mẫu</Link>
          <a className="tc-nut vien" href="#dat-trang">Nhắn Zalo đặt trang</a>
        </div>
        <span className="tc-mo">Khoảng 30.000đ mỗi bạn cho lớp 50 người · Nhận trang sau 7–10 ngày</span>
      </header>

      <section className="tc-vao-lop" id="vao-lop">
        <form className="tc-khung tc-vao-lop-trong" onSubmit={vaoLop}>
          <div>
            <strong>Vào trang lớp của bạn</strong>
            <span>Mất link hoặc không quét được QR? Nhập mã lớp in trên thư mời.</span>
          </div>
          <div className="tc-o-nhap">
            <label htmlFor="ma-lop" className="an-di">Mã lớp</label>
            <input id="ma-lop" value={ma} onChange={(e) => setMa(e.target.value)} placeholder="Mã lớp, ví dụ k7m2pa" autoCapitalize="none" autoCorrect="off" />
            <button type="submit">Vào lớp</button>
          </div>
        </form>
      </section>

      <section className="tc-khung tc-muc">
        <h2>Ba mẫu giao diện</h2>
        <div className="tc-luoi">
          {DANH_SACH_GIAO_DIEN.map((k) => (
            <Link key={k} className="tc-the" to={`/${MA_LOP_MAU}?giao-dien=${k}`}>
              <span className="tc-the-mau" style={{ background: GIAO_DIEN[k].mau.primary }} aria-hidden="true" />
              <strong>{GIAO_DIEN[k].ten}</strong>
              <span>{GIAO_DIEN[k].moTa}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="tc-dat" id="dat-trang">
        <div className="tc-khung tc-dat-trong">
          <div>
            <span className="tc-chu-tay vang">Sắp họp lớp rồi?</span>
            <strong>Đặt trước 2 tuần để kịp có QR cho buổi họp.</strong>
          </div>
          <a className="tc-nut trang" href="#">Nhắn Zalo [số điện thoại]</a>
        </div>
      </section>

      <footer className="tc-khung tc-chan">© thanhxuan.vn · [Tên hộ kinh doanh]</footer>
    </div>
  )
}
