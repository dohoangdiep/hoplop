# hoplop — Trang kỷ niệm họp lớp (thanhxuan.vn)

Tài liệu này là bản đặc tả cho Claude Code. Đọc hết trước khi viết code. Giao diện người dùng viết bằng **tiếng Việt**.

## 1. Sản phẩm là gì

"Cuốn lưu bút số" của một lớp học cũ. Mỗi lớp có một trang riêng tư, sống lâu dài, **mỗi lần họp lớp thêm một chương**.

Không phải công cụ tổ chức họp lớp: xác nhận tham dự và thu tiền vẫn diễn ra trên nhóm Zalo. Sản phẩm tập trung vào **giữ kỷ niệm**:

- Sơ đồ chỗ ngồi: chạm vào một bạn để xem ảnh ngày ấy – bây giờ, biệt danh, câu lưu bút
- Kho ảnh xưa: cả lớp cùng góp, chia theo từng năm học (theo cấp học của lớp), Cắm trại, Bế giảng…
- Dòng thời gian các lần họp lớp (mỗi lần là một chương, có album, ảnh tập thể, video)
- "Năm nay – năm ngoái": ảnh tập thể các năm đặt cạnh nhau
- "Tái hiện": ảnh xưa và ảnh chụp lại cùng tư thế
- Hộp thư thời gian: thư hẹn mở vào một lần họp sau (**tạm tắt từ 06/10**, công tắc `BAT_HOP_THU` trong `src/data/tinhNang.ts`; code và dữ liệu giữ nguyên)
- Góc thầy cô
- Gửi ảnh cho lớp bất cứ lúc nào: ảnh thời đi học hoặc ảnh một lần họp lớp (kể cả buổi đã qua)
- QR tại buổi họp: lối tắt vào trang gửi ảnh, chọn sẵn buổi họp đó, không cần cài app hay đăng nhập

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
| `/:ma` | Trang lớp. `ma` = mã ngắn 6 ký tự. **Vào bằng mã lớp thì không cần mật khẩu** |
| `/:ten_goi` | Tên gọi tùy chọn của lớp, trỏ về cùng lớp. **Vào bằng tên gọi thì phải nhập mật khẩu lớp** (tên gọi dễ đoán) |
| `/:ma/gui-anh` | Gửi ảnh cho lớp (một trang chung cho ảnh xưa và ảnh các buổi họp; mockup `GuiAnhXua.dc.html`) |
| `/:ma/q/:chuong_ma` | Lối tắt từ QR buổi họp: mở trang gửi ảnh với buổi họp đã chọn sẵn |
| `/lop-truong` | Lớp trưởng đăng nhập bằng số điện thoại + mã PIN |
| `/quan-tri` | Trang quản trị của chủ dịch vụ (đăng nhập email) |

- **Mã lớp**: 6 ký tự ngẫu nhiên từ bảng `abcdefghjkmnpqrstuvwxyz23456789` (đã bỏ 0, o, 1, l, i). Không bao giờ đổi, vì QR đã in ra phải dùng được mãi.
- **Tên gọi** (`ten_goi`): tùy chọn, duy nhất, chữ thường không dấu, số và dấu gạch. Đổi được; tên cũ nên tiếp tục chuyển hướng.
- Tìm lớp: theo `ma` trước, không thấy thì theo `ten_goi`.
- **Tên miền riêng**: đọc `window.location.hostname`; nếu khác tên miền chính thì tra bảng `ten_mien` để ra lớp và hiển thị trang lớp ngay tại `/`.
- Trang lớp: `<meta name="robots" content="noindex">`. Trang chủ thì được index.
- Thẻ Open Graph của trang lớp: tên lớp + trường + ảnh bìa, để chia sẻ qua Zalo hiện đẹp. (Vì là SPA, cần một Cloudflare Pages Function hoặc Worker chèn OG tags cho bot.)

## 5. Ba vai người dùng (đã chốt 06/10/2026)

Với mô hình làm hộ, chủ dịch vụ dựng phần nặng (thành viên, sơ đồ, ảnh chân dung, giao diện). Lớp trưởng hơn thành viên ở **duyệt ảnh**, **tạo buổi họp**, và (từ 06/10 tối) **tự làm Tái hiện, Góc thầy cô**.

| | Thành viên | Lớp trưởng (tối đa 2 người: trưởng + phó, quyền như nhau) | Chủ dịch vụ (quản trị hệ thống) |
|---|---|---|---|
| Vào | Trang chủ gõ mã lớp, hoặc bấm link/QR. Không tài khoản | **SĐT + mã PIN 6 số** ở `/lop-truong` (không cần mã lớp; SĐT là lớp trưởng của 2 lớp thì cho chọn). Nhập một lần, máy nhớ | Email OTP ở `/quan-tri`, cờ trong bảng `quan_tri_he_thong` |
| Xem trang lớp | Có | Có | Mọi lớp |
| Gửi ảnh (chọn "chụp hồi nào") | Có, **vào hàng chờ duyệt** | Có, hiện ngay | Có, hiện ngay |
| Duyệt / ẩn / xóa hẳn ảnh, xếp mục hoặc buổi | | Có | Có |
| Tạo buổi họp, lấy QR | | Có | Có |
| Tái hiện, Góc thầy cô (thêm/sửa/xóa) | | Có | Có |
| Thành viên, sơ đồ, giao diện, gia hạn, tài khoản lớp trưởng | | | Có |

**Tài khoản lớp trưởng:** chủ dịch vụ tạo khi tạo lớp (họ tên + SĐT), hệ thống sinh PIN 6 số và soạn tin nhắn Zalo gửi riêng. Quên PIN hoặc đổi người: chủ dịch vụ tìm lớp theo SĐT rồi "Tạo PIN mới" / xóa người. Nhập sai PIN 5 lần thì khóa 15 phút. **Không dùng SĐT một mình làm thông tin đăng nhập** (cả lớp đều biết SĐT lớp trưởng). Không gửi SMS, không cần email cho lớp trưởng.

**Số điện thoại lớp trưởng** là cách chủ dịch vụ nhận ra lớp khi hỗ trợ: danh sách lớp trong quản trị hiện tên + SĐT lớp trưởng, có nút mở Zalo, và ô tìm kiếm chung tìm theo SĐT (chuẩn hóa +84/0, dấu cách; tìm được bằng vài số cuối), mã lớp, tên lớp, trường. SĐT **không** hiện trên trang lớp.

**Mật khẩu lớp:** chỉ cần khi vào bằng tên gọi, hoặc khi lớp bật công tắc "Luôn cần mật khẩu" (dùng khi mã lớp bị lộ ra ngoài, vì mã lớp không đổi được do QR đã in).

Kỹ thuật: mọi đọc ghi của thành viên và lớp trưởng đi qua hàm Postgres `security definer` (như `xem_lop`) kiểm tra mã lớp / mật khẩu / SĐT + PIN (bcrypt) và giới hạn số lần sai. Trình duyệt lưu thông tin đã nhập trong localStorage. **Không để lộ dữ liệu lớp này cho người của lớp khác.**

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
anh            id, lop_id, loai ('xua' | 'chuong'), chuong_id (null nếu ảnh xưa), muc (theo cấp: 'lop-1'…'lop-12' | 'nam-1'…'nam-4'; + 'cam-trai' | 'be-giang' | 'khac'; 'chan-dung' = ảnh riêng; null = chưa rõ),
               nam_hoc, chu_thich, nguoi_gui_ten, trang_thai ('cho-duyet' | 'da-duyet' | 'an'),
               duong_dan_goc, duong_dan_xem, rong, cao, dung_luong, tao_luc
anh_nguoi      anh_id, thanh_vien_id                -- gắn tên người trong ảnh
tai_hien       id, lop_id, anh_xua_id, anh_nay_id, chu_thich
thu_hen_gio    id, lop_id, nguoi_viet, noi_dung, mo_vao_chuong_id hoặc mo_vao_ngay, da_mo (bool)
thay_co        id, lop_id, ho_ten, vai_tro, mon, cau_noi, anh_id
ten_mien       hostname (unique), lop_id, het_han
lop_truong     id, lop_id, ho_ten, sdt (chuẩn hóa dạng 0xxxxxxxxx), pin_hash, tao_luc   -- tối đa 2 mỗi lớp
lop (thêm)     luon_can_mat_khau (bool, mặc định false), cap ('tieu-hoc' Lớp 1–5 | 'thcs' Lớp 6–9 | 'thpt' Lớp 10–12, mặc định | 'dai-hoc' Năm 1–4)
```

Bật RLS cho mọi bảng. Viết migration SQL trong `supabase/migrations/`.

## 7. Ảnh (phần quan trọng nhất)

- **Nén trên điện thoại trước khi tải lên** (vd `browser-image-compression`). Mỗi ảnh tạo 2 bản:
  - bản xem: cạnh dài ~1600px, ~300–500KB, dùng khi hiển thị
  - bản gốc: giữ nguyên, chỉ tải khi người dùng bấm "Tải ảnh gốc" hoặc xuất zip
- Bucket **riêng tư**. Hiển thị qua signed URL có hạn.
- Ảnh thành viên gửi (kể cả qua QR) luôn ở trạng thái `cho-duyet`; chỉ `da-duyet` mới hiện. Ảnh lớp trưởng và chủ dịch vụ gửi được duyệt sẵn.
- Một trang gửi ảnh chung: chọn ảnh → "Ảnh này chụp hồi nào?" (Thời đi học: các năm theo cấp học của lớp, Cắm trại, Bế giảng, Khác · Các lần họp lớp: danh sách chương · Không nhớ rõ) → tên bạn → gửi. QR buổi họp chỉ chọn sẵn buổi đó; QR không cần hết hạn.
- Người gửi thấy ảnh của mình đang chờ duyệt (lưu id ảnh trong localStorage) để không gửi lại.
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

**Đợt 1b – vai trò đã chốt 06/10 (đã làm 06/10, file SQL 0006):**
- Tài khoản lớp trưởng (SĐT + PIN), tìm lớp theo SĐT, cột "ảnh chờ duyệt" trong danh sách lớp
- Vào lớp chỉ bằng mã lớp; tên gọi và công tắc "Luôn cần mật khẩu" mới hỏi mật khẩu
- Trang gửi ảnh chung có bước "chụp hồi nào"; ảnh thành viên chờ duyệt
- Trang lớp trưởng trên điện thoại: duyệt ảnh, tạo buổi họp, lấy QR

**Đợt 2:**
7. Hộp thư thời gian (SQL 0007), tái hiện, góc thầy cô (SQL 0008; lớp trưởng tự làm: SQL 0009): đã làm
8. Xuất zip toàn bộ ảnh gốc
9. Ngày hết hạn, chế độ chỉ xem, nhắc gia hạn
10. Tên miền riêng, OG tags cho bot
11. (Đã chuyển lên Đợt 1b: lớp trưởng tạo buổi họp)

## 10. Quy ước

- Toàn bộ chữ trên giao diện bằng tiếng Việt, giọng thân mật ("các bạn", "lớp mình").
- Khả năng tiếp cận: vùng bấm ≥ 44px, chữ tương phản ≥ 4.5:1, dùng `<button>`, `<a>`, `<label>` thật.
- Không dùng emoji làm biểu tượng; dùng icon SVG nét.
- Không bịa số liệu hay lời nhận xét khách hàng; chỗ chưa có dùng `[...]`.
- Dữ liệu cá nhân và ảnh là của lớp: không index, không công khai, không chia sẻ chéo giữa các lớp.

## 11. Tiến độ

Xem `docs/TIEN_DO.md`: đã làm gì, file SQL nào đã chạy, việc tiếp theo.
