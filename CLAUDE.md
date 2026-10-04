# hoplop — Trang kỷ niệm họp lớp (thanhxuan.vn)

Tài liệu này là bản đặc tả cho Claude Code. Đọc hết trước khi viết code. Giao diện người dùng viết bằng **tiếng Việt**.

## 1. Sản phẩm là gì

"Cuốn lưu bút số" của một lớp học cũ. Mỗi lớp có một trang riêng tư, sống lâu dài, **mỗi lần họp lớp thêm một chương**.

Không phải công cụ tổ chức họp lớp: xác nhận tham dự và thu tiền vẫn diễn ra trên nhóm Zalo. Sản phẩm tập trung vào **giữ kỷ niệm**:

- Sơ đồ chỗ ngồi: chạm vào một bạn để xem ảnh ngày ấy – bây giờ, biệt danh, câu lưu bút
- Kho ảnh xưa: cả lớp cùng góp, chia theo Lớp 10/11/12, Cắm trại, Bế giảng…
- Dòng thời gian các lần họp lớp (mỗi lần là một chương, có album, ảnh tập thể, video)
- "Năm nay – năm ngoái": ảnh tập thể các năm đặt cạnh nhau
- "Tái hiện": ảnh xưa và ảnh chụp lại cùng tư thế
- Hộp thư thời gian: thư hẹn mở vào một lần họp sau
- Góc thầy cô
- QR tại buổi họp: khách quét để đẩy ảnh vào chương của năm đó, không cần cài app hay đăng nhập

Mô hình kinh doanh: **làm hộ** (chủ dịch vụ dựng nội dung cho lớp). 1.500.000đ năm đầu, 500.000đ mỗi năm gia hạn. Ngừng gia hạn: trang chỉ xem trong 6 tháng, lớp tải được toàn bộ ảnh gốc (file zip), sau đó chuyển lưu trữ lạnh.

Người dùng phần lớn 27–60 tuổi, dùng điện thoại, vào trang qua QR hoặc link Zalo. **Thiết kế cho điện thoại trước.**

## 2. Nguyên tắc kiến trúc

- **Một ứng dụng duy nhất cho tất cả các lớp** (multi-tenant). Tạo lớp mới = thêm một dòng dữ liệu, không build hay deploy gì.
- **Tách giao diện khỏi nội dung.** Component không bao giờ ghi cứng màu, phông, bo góc. Mọi thứ đọc từ bộ thông số trong `src/themes/themes.json`, áp vào bằng CSS variables. Thêm hoặc sửa mẫu giao diện = sửa file thông số.
- Kho ảnh phải chuyển được sang S3-compatible khác (Cloudflare R2, Viettel/PA) mà không đổi logic: bọc mọi thao tác lưu trữ trong một module `src/lib/storage.ts`.

## 3. Công nghệ

| Phần | Dùng |
|---|---|
| Frontend | React + Vite + TypeScript, React Router |
| Style | CSS variables theo theme (+ Tailwind nếu tiện, nhưng màu phải lấy từ biến) |
| Backend | Supabase, khu vực Singapore: Postgres, Auth (OTP), Storage, Edge Functions |
| Hosting | Cloudflare Pages, build `npm run build`, output `dist` |
| Ảnh về sau | Cloudflare R2 (không phí băng thông ra) |

Biến môi trường: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (key dạng `sb_publishable_...`, công khai, đã đặt sẵn trong `.env.production`). Tuyệt đối không đưa secret key `sb_secret_...` hay mật khẩu database vào repo. Cần file `public/_redirects` chứa `/* /index.html 200` để không lỗi 404 khi F5 ở trang con.

## 4. Địa chỉ (routing)

| Đường dẫn | Trang |
|---|---|
| `/` | Trang chủ bán hàng (mockup `TrangChu.dc.html`) |
| `/:ma` | Trang lớp. `ma` = mã ngắn 6 ký tự |
| `/:ten_goi` | Tên gọi tùy chọn của lớp, trỏ về cùng lớp |
| `/:ma/gui-anh` | Gửi ảnh xưa (mockup `GuiAnhXua.dc.html`) |
| `/:ma/q/:chuong_ma` | Trang gửi ảnh qua QR tại buổi họp, tự gắn vào chương |
| `/quan-tri` | Trang quản trị (quản trị lớp và quản trị hệ thống) |

- **Mã lớp**: 6 ký tự ngẫu nhiên từ bảng `abcdefghjkmnpqrstuvwxyz23456789` (đã bỏ 0, o, 1, l, i). Không bao giờ đổi, vì QR đã in ra phải dùng được mãi.
- **Tên gọi** (`ten_goi`): tùy chọn, duy nhất, chữ thường không dấu, số và dấu gạch. Đổi được; tên cũ nên tiếp tục chuyển hướng.
- Tìm lớp: theo `ma` trước, không thấy thì theo `ten_goi`.
- **Tên miền riêng**: đọc `window.location.hostname`; nếu khác tên miền chính thì tra bảng `ten_mien` để ra lớp và hiển thị trang lớp ngay tại `/`.
- Trang lớp: `<meta name="robots" content="noindex">`. Trang chủ thì được index.
- Thẻ Open Graph của trang lớp: tên lớp + trường + ảnh bìa, để chia sẻ qua Zalo hiện đẹp. (Vì là SPA, cần một Cloudflare Pages Function hoặc Worker chèn OG tags cho bot.)

## 5. Ba vai người dùng

| Vai | Đăng nhập | Quyền |
|---|---|---|
| Thành viên | Không có tài khoản. Nhập **mật khẩu lớp** hoặc vào bằng QR/link có token | Xem trang, gửi ảnh (vào hàng chờ duyệt), viết thư hẹn giờ. Khi gửi chỉ nhập "Tên bạn" |
| Quản trị lớp (1–3 người ban liên lạc) | Supabase Auth OTP qua email hoặc số điện thoại | Duyệt/ẩn ảnh, sửa thông tin lớp và sơ đồ, mở chương mới, lấy QR, đổi mật khẩu lớp |
| Quản trị hệ thống (chủ dịch vụ) | Supabase Auth, cờ `la_quan_tri_he_thong` | Tất cả lớp: tạo lớp, dựng nội dung, gia hạn, gán tên miền |

Cơ chế vào lớp của thành viên (đã làm): hàm Postgres `xem_lop(p_khoa, p_mat_khau)` (security definer, migration 0002) kiểm tra bcrypt và trả về nội dung lớp dạng JSON; sai quá 10 lần/10 phút thì tạm khóa. Trình duyệt lưu mật khẩu trong localStorage để lần sau tự mở. Phần ghi (gửi ảnh qua QR) sẽ dùng hàm/Edge Function riêng kiểm tra mật khẩu hoặc `chuong.ma_qr`. Mọi đọc ghi dữ liệu lớp đi qua RLS hoặc Edge Function kiểm tra token đó. **Không để lộ dữ liệu lớp này cho token của lớp khác.**

## 6. Dữ liệu (Postgres)

```
lop            id, ma (unique), ten_goi (unique, null), ten_lop, truong, tinh, nien_khoa_bat_dau, nien_khoa_ket_thuc,
               giao_dien ('hoai-niem' | 'tuoi-sang' | 'thanh-lich'), mat_khau_hash, anh_bia_id,
               trang_thai ('thu-tu-lieu' | 'dang-dung' | 'da-ban-giao' | 'chi-xem' | 'luu-tru'),
               het_han (date), ghi_chu_noi_bo, tao_luc
quan_tri_lop   lop_id, user_id, vai ('chu' | 'duyet-anh')
thanh_vien     id, lop_id, ho_ten, ten_goi_tat (vd "Hùng"), biet_danh, noi_o, cau_luu_but,
               anh_xua_id, anh_nay_id, an_thong_tin (bool)
so_do          lop_id, so_day, so_ban_moi_day, cho_moi_ban, bang_den_o ('tren' | 'duoi')
cho_ngoi       lop_id, day, ban, vi_tri, thanh_vien_id
chuong         id, lop_id, ma_qr (unique), tieu_de, ngay, dia_diem, mo_ta, anh_tap_the_id, video_url,
               qr_hieu_luc_tu, qr_hieu_luc_den, thu_tu
anh            id, lop_id, loai ('xua' | 'chuong'), chuong_id (null nếu ảnh xưa), muc ('lop-10' | 'lop-11' | 'lop-12' | 'cam-trai' | 'be-giang' | 'khac'),
               nam_hoc, chu_thich, nguoi_gui_ten, trang_thai ('cho-duyet' | 'da-duyet' | 'an'),
               duong_dan_goc, duong_dan_xem, rong, cao, dung_luong, tao_luc
anh_nguoi      anh_id, thanh_vien_id                -- gắn tên người trong ảnh
tai_hien       id, lop_id, anh_xua_id, anh_nay_id, chu_thich
thu_hen_gio    id, lop_id, nguoi_viet, noi_dung, mo_vao_chuong_id hoặc mo_vao_ngay, da_mo (bool)
thay_co        id, lop_id, ho_ten, vai_tro, mon, cau_noi, anh_id
ten_mien       hostname (unique), lop_id, het_han
```

Bật RLS cho mọi bảng. Viết migration SQL trong `supabase/migrations/`.

## 7. Ảnh (phần quan trọng nhất)

- **Nén trên điện thoại trước khi tải lên** (vd `browser-image-compression`). Mỗi ảnh tạo 2 bản:
  - bản xem: cạnh dài ~1600px, ~300–500KB, dùng khi hiển thị
  - bản gốc: giữ nguyên, chỉ tải khi người dùng bấm "Tải ảnh gốc" hoặc xuất zip
- Bucket **riêng tư**. Hiển thị qua signed URL có hạn.
- Ảnh gửi lên luôn ở trạng thái `cho-duyet`; chỉ `da-duyet` mới hiện.
- Giới hạn: tối đa ~20 ảnh mỗi lần gửi, ~20MB mỗi ảnh; video giới hạn riêng.
- Tải lên phải chịu được mạng 4G yếu ở nhà hàng: tải từng ảnh, có tiến độ, thử lại khi lỗi.
- Đường dẫn lưu trữ: `lop/{lop_id}/{loai}/{anh_id}/{goc|xem}.jpg`.
- Mục tiêu dung lượng: ~1GB ảnh/lớp/năm. Gói chuẩn 3GB/năm.

## 8. Giao diện (theme)

- 3 mẫu trong `src/themes/themes.json`: `hoai-niem`, `tuoi-sang`, `thanh-lich`. Mỗi mẫu gồm: font, màu, bo góc, đổ bóng và `kieuBia` (`polaroid` | `khoi-mau` | `tran-khung`).
- Lúc vào trang lớp: đọc `lop.giao_dien`, nạp Google Fonts của mẫu, đặt CSS variables lên phần tử gốc (vd `--mau-bg`, `--mau-primary`, `--bo-md`, `--font-display`).
- Trang bìa có 3 biến thể bố cục theo `kieuBia`; các khối còn lại dùng chung, chỉ khác biến.
- Thiết kế tham chiếu: `docs/mockup/MauHoaiNiem.dc.html`, `MauTuoiSang.dc.html`, `MauThanhLich.dc.html` (cùng lớp 12A1, cùng khối, khác giao diện). Trang lớp đầy đủ: `docs/mockup/Main.dc.html`. Các file `.dc.html` là mockup để tham khảo bố cục, màu và nội dung, **không** dùng trực tiếp làm code.
- Giao diện sẽ được thiết kế lại sau. Vì vậy giữ đúng nguyên tắc: không ghi cứng giá trị giao diện trong component.

## 9. Màn hình và thứ tự làm

**Đợt 1 – bắt buộc trước 15/11 (kịp mùa họp lớp Tết):**
1. Khung dự án, Supabase schema + RLS, routing, cơ chế theme
2. Trang lớp chỉ xem: bìa, sắp họp lớp, sơ đồ chỗ ngồi, kho ảnh xưa, dòng thời gian, năm nay – năm ngoái
3. Vào lớp bằng mật khẩu / token QR
4. Gửi ảnh xưa và gửi ảnh qua QR chương (nén, tải lên, hàng chờ duyệt)
5. Quản trị: danh sách lớp, tạo lớp mới (tự sinh mã, mật khẩu, QR), nhập thành viên, nhập sơ đồ chỗ ngồi, duyệt và xếp ảnh vào mục, tạo chương, chọn giao diện
6. Trang chủ bán hàng `/` với ô "Vào lớp của bạn" và lớp mẫu công khai (không mật khẩu)

**Đợt 2:**
7. Hộp thư thời gian, tái hiện, góc thầy cô
8. Xuất zip toàn bộ ảnh gốc
9. Ngày hết hạn, chế độ chỉ xem, nhắc gia hạn
10. Tên miền riêng, OG tags cho bot
11. Quản trị lớp tự tạo chương mới

## 10. Quy ước

- Toàn bộ chữ trên giao diện bằng tiếng Việt, giọng thân mật ("các bạn", "lớp mình").
- Khả năng tiếp cận: vùng bấm ≥ 44px, chữ tương phản ≥ 4.5:1, dùng `<button>`, `<a>`, `<label>` thật.
- Không dùng emoji làm biểu tượng; dùng icon SVG nét.
- Không bịa số liệu hay lời nhận xét khách hàng; chỗ chưa có dùng `[...]`.
- Dữ liệu cá nhân và ảnh là của lớp: không index, không công khai, không chia sẻ chéo giữa các lớp.
