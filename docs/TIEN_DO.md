# hoplop: tiến độ và bàn giao (cập nhật 05/10/2026)

Đây là file bàn giao để chuyển sang một cuộc trò chuyện mới. Đặc tả đầy đủ của sản phẩm nằm trong `CLAUDE.md` ở gốc kho; file này chỉ ghi **đã làm gì, đang ở đâu, việc tiếp theo**.

## 1. Thông tin chung

| Mục | Giá trị |
|---|---|
| Kho code | GitHub `dohoangdiep/hoplop`, nhánh `main` |
| Trang chạy thật | https://hoplop-dl9.pages.dev (Cloudflare Pages, tự cập nhật khi đẩy lên `main`) |
| Supabase | `https://yjimrzkxhlfehxjygvpj.supabase.co`, khu vực Singapore |
| Publishable key | Đã đặt trong `.env.production` (key công khai, được phép nằm trong kho) |
| Thiết kế tham chiếu | Canvas mockup trên claude.ai (Main, GuiAnhXua, TrangChu, TrangChuDienThoai, 3 mẫu giao diện); bản sao trong `docs/mockup/*.dc.html` |
| Tên miền dự kiến | thanhxuan.vn |

**Bảo mật, luôn tuân thủ:** không bao giờ hỏi xin hay đưa vào kho mật khẩu database, secret key `sb_secret_...` / service_role, hay mật khẩu tài khoản Supabase. Mọi thay đổi database do chủ dự án tự dán file SQL vào Supabase → SQL Editor.

**Môi trường làm việc của Claude:** không truy cập được pages.dev hay supabase.co, nên không thử được với dữ liệu thật. Kiểm tra bằng `npm run build` và xem trước lớp mẫu `/xemmau` bằng `vite preview`; phần dữ liệu thật do chủ dự án thử rồi gửi ảnh chụp màn hình.

**Commit:** `git -c user.name="dohoangdiep" -c user.email="dohoangdiep@gmail.com" commit ...`, kèm dòng `Co-Authored-By` theo quy định của phiên. Chủ dự án đồng ý cho đẩy thẳng lên `main` sau mỗi phần việc.

## 2. Mô hình kinh doanh đã chốt

- Làm hộ: 1.500.000đ năm đầu, 500.000đ/năm gia hạn. Tên miền riêng là dịch vụ bán thêm.
- Một hệ thống cho tất cả các lớp. Mỗi lớp có mã 6 ký tự cố định (QR đã in dùng được mãi), cộng tên gọi tùy chọn.
- Đăng ký tham dự và thu tiền vẫn làm trên Zalo; trang chỉ lo **giữ kỷ niệm**.
- 3 mẫu giao diện: Hoài niệm, Tươi sáng, Thanh lịch. Giao diện tạm dùng; sẽ thiết kế lại sau bằng cách sửa `src/themes/themes.json`.

## 3. File SQL (chạy lần lượt trong Supabase → SQL Editor)

| File | Nội dung | Trạng thái |
|---|---|---|
| `0001_cau_truc_ban_dau.sql` | Bảng, RLS, bucket `anh`, quyền quản trị | Đã chạy |
| `0002_xem_lop.sql` | `xem_lop` (vào lớp bằng mật khẩu, khóa 10 lần sai/10 phút) | Đã chạy |
| `0003_anh.sql` | `tao_luot_gui`, `xong_tai_anh`, quyền tải/xem ảnh | Đã chạy |
| `0004_muc_chan_dung.sql` | Thêm mục ảnh `chan-dung` | Đã chạy (lỗi demo "Không kết nối được" trước đây là do thiếu file này) |
| `0005_chuong.sql` | `thong_tin_qr`, `xem_lop` trả thêm mô tả, video, ảnh tập thể từng buổi | Đã chạy (chủ dự án đã thử chương và ảnh chương) |

Quản trị hệ thống: user của chủ dự án đã được thêm vào bảng `quan_tri_he_thong`.

## 4. Đã làm xong (Đợt 1)

1. **Khung dự án:** React + Vite + TS, routing, cơ chế theme bằng CSS variables, `public/_redirects`, deploy Cloudflare Pages.
2. **Trang lớp** `/:ma`: bìa (3 kiểu `kieuBia`), ô Sắp họp lớp (buổi gần nhất, "Hôm nay!" đúng ngày), sơ đồ chỗ ngồi (chạm xem ảnh ngày ấy – bây giờ, biệt danh, lưu bút), kho ảnh xưa theo mục, dòng thời gian các lần họp có album thật (ảnh tập thể, 6 ảnh đầu, "Xem thêm", xem lớn lướt qua lại, link video), khối **Năm nay – năm ngoái** (ảnh bìa ngày ra trường là mốc đầu tiên).
3. **Vào lớp bằng mật khẩu**, lưu mật khẩu trong máy để lần sau tự mở. Lớp mẫu công khai `/xemmau` có nút đổi 3 giao diện.
4. **Gửi ảnh xưa** `/:ma/gui-anh`: nén trên điện thoại (~1600px), tải từng ảnh, thử lại khi lỗi, vào hàng chờ duyệt.
5. **Gửi ảnh qua QR tại buổi họp** `/:ma/q/:maQr`: không cần mật khẩu; chỉ lộ tên lớp và tên buổi; tôn trọng khoảng ngày nhận ảnh của QR.
6. **Quản trị** `/quan-tri` (đăng nhập email):
   - Danh sách lớp, tạo lớp (tự sinh mã, mật khẩu, QR, tin nhắn gửi ban liên lạc), đổi giao diện/trạng thái, đặt lại mật khẩu.
   - Thành viên: dán danh sách `Họ tên | biệt danh | nơi ở | lưu bút`; sửa/xóa từng bạn; **ô tải ảnh Ngày ấy / Bây giờ ngay cạnh tên**, đếm số bạn đã đủ 2 ảnh.
   - Sơ đồ chỗ ngồi: số dãy/bàn/chỗ, bấm chỗ để xếp, xếp lần lượt. Quy tắc đã chốt: thiếu chỗ thì báo và có nút thêm dãy; thừa chỗ thì admin tự xóa hàng/cột, còn lẻ thì để đó.
   - Các lần họp (chương): thêm/sửa/xóa (tên, ngày, địa điểm, mô tả, link video, khoảng ngày nhận ảnh QR); **tờ QR A5 để in** + chép link + mở thử.
   - Ảnh: lọc theo kho ảnh xưa / từng buổi; Chờ duyệt / Đã duyệt / Đã ẩn; duyệt, ẩn, tải ảnh gốc, đổi mục, gắn làm ảnh ngày ấy/bây giờ của một bạn, đặt làm ảnh bìa, đặt làm ảnh tập thể của buổi.
   - Ảnh do quản trị tải lên (kể cả qua trang QR khi đang đăng nhập) được duyệt sẵn.
7. **Dữ liệu demo để thử:** nút "Nạp ảnh demo" vẽ ảnh hoạt hình trên trình duyệt (24 bạn mẫu, sơ đồ, ~14 ảnh xưa, chân dung, 2 buổi họp), chạy tiếp được từ chỗ dừng. Bật/tắt bằng `VITE_BAT_DEMO` trong `.env.production` (1 = bật, 0 = tắt). **Tắt trước khi bán cho khách.**

## 5. Việc tiếp theo

**Còn của Đợt 1:**
- Trang chủ bán hàng `/` hoàn chỉnh theo mockup `TrangChu.dc.html` / `TrangChuDienThoai.dc.html` (hiện là bản đơn giản, đã có ô "Vào lớp của bạn" và link lớp mẫu).
- Tắt `VITE_BAT_DEMO` khi thử xong; có thể thêm nút "Xóa dữ liệu demo".
- Cấu hình SMTP riêng cho email đăng nhập (giới hạn gửi email mặc định của Supabase rất thấp).

**Đợt 2 (theo `CLAUDE.md` mục 9):**
7. Hộp thư thời gian, Tái hiện (ảnh xưa – ảnh chụp lại cùng tư thế), Góc thầy cô
8. Xuất zip toàn bộ ảnh gốc
9. Ngày hết hạn, chế độ chỉ xem, nhắc gia hạn
10. Tên miền riêng, OG tags cho bot (Cloudflare Pages Function)
11. Quản trị lớp (ban liên lạc) tự tạo chương mới; phân quyền `quan_tri_lop`

**Ghi chú kỹ thuật:**
- Trong trang lớp, buổi họp hiện ở dòng thời gian khi ngày ≤ hôm nay **hoặc** đã có ảnh. Buổi tương lai chưa có ảnh chỉ hiện ở ô Sắp họp lớp.
- Ảnh chân dung (`muc = 'chan-dung'`) không hiện trong kho ảnh xưa.
- Đường dẫn ảnh: `lop/{lop_id}/{xua|chuong}/{anh_id}/{xem.jpg|goc.<đuôi>}`; bucket riêng tư, hiển thị bằng signed URL.

## 6. Cách bắt đầu cuộc trò chuyện mới

Mở chat mới gắn với kho `dohoangdiep/hoplop`, rồi nhắn:

> Đọc `CLAUDE.md` và `docs/TIEN_DO.md` rồi làm tiếp: [việc anh muốn làm, ví dụ "trang chủ bán hàng"].
