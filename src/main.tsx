import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TrangChu from './pages/TrangChu'
import TrangLop from './pages/TrangLop'
import { SapCo } from './pages/SapCo'
import QuanTri from './pages/QuanTri'

const fontChung = document.createElement('link')
fontChung.rel = 'stylesheet'
fontChung.href = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Playfair+Display:wght@600;700&family=Dancing+Script:wght@600&display=swap'
document.head.appendChild(fontChung)
document.body.style.margin = '0'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TrangChu />} />
        <Route path="/quan-tri/*" element={<QuanTri />} />
        <Route path="/:ma" element={<TrangLop />} />
        <Route path="/:ma/gui-anh" element={<SapCo tieuDe="Gửi ảnh xưa" moTa="Phần gửi ảnh (nén ảnh trên điện thoại, tải lên, chờ ban liên lạc duyệt) đang được làm." />} />
        <Route path="/:ma/q/:chuongMa" element={<SapCo tieuDe="Gửi ảnh buổi họp lớp" moTa="Phần gửi ảnh qua QR tại buổi họp đang được làm." />} />
        <Route path="*" element={<SapCo tieuDe="Không tìm thấy trang" moTa="Đường dẫn này không tồn tại." />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
