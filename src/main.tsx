import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TrangChu from './pages/TrangChu'
import { SapCo } from './pages/SapCo'

// Trang chủ nạp ngay; các trang khác tách thành gói riêng để trang chủ mở nhanh trên 4G
const TrangLop = lazy(() => import('./pages/TrangLop'))
const QuanTri = lazy(() => import('./pages/QuanTri'))
const GuiAnh = lazy(() => import('./pages/GuiAnh'))
const GuiAnhQr = lazy(() => import('./pages/GuiAnhQr'))

const fontChung = document.createElement('link')
fontChung.rel = 'stylesheet'
fontChung.href = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Playfair+Display:wght@600;700&family=Dancing+Script:wght@600&display=swap'
document.head.appendChild(fontChung)
document.body.style.margin = '0'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<TrangChu />} />
        <Route path="/quan-tri/*" element={<QuanTri />} />
        <Route path="/:ma" element={<TrangLop />} />
        <Route path="/:ma/gui-anh" element={<GuiAnh />} />
        <Route path="/:ma/q/:chuongMa" element={<GuiAnhQr />} />
        <Route path="*" element={<SapCo tieuDe="Không tìm thấy trang" moTa="Đường dẫn này không tồn tại." />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
