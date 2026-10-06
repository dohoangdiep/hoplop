# hoplop: tiến độ và bàn giao (cập nhật 06/10/2026, sau Đợt 1b)

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
| `0006_lop_truong_gui_anh_chung.sql` | Đợt 1b: lớp trưởng (SĐT + PIN), vào lớp bằng mã, trang gửi ảnh chung, công tắc "Luôn cần mật khẩu" | Đã chạy (06/10) |
| `0007_hop_thu_ten_goi.sql` | Hộp thư thời gian (`thu_cua_lop`, `viet_thu`), đổi tên gọi (`qt_dat_ten_goi`, bảng `ten_goi_cu`, `dia_chi_moi`) | Chạy chưa? (chủ dự án xác nhận) |
| `0008_tai_hien_thay_co.sql` | Tái hiện + Góc thầy cô: thêm cột năm/thứ tự, hàm `xem_lop_them` cho trang lớp | Chạy chưa? (chủ dự án xác nhận) |
| `0009_lop_truong_tai_hien_thay_co.sql` | Lớp trưởng/lớp phó tự làm Tái hiện, Góc thầy cô: `lt_ds_them`, `lt_luu_tai_hien`, `lt_xoa_tai_hien`, `lt_luu_thay_co`, `lt_xoa_thay_co`, `lt_dat_anh_rieng` | **Chưa chạy** |

Quản trị hệ thống: user của chủ dự án đã được thêm vào bảng `quan_tri_he_thong`.

File 0006 đã được chạy thử trên Postgres 16 cục bộ (giả lập schema `auth`/`storage` của Supabase, chạy lần lượt 0001→0006), cùng một bộ thử đầu-cuối 23 bước trên bản build thật (Chromium, cỡ điện thoại 390px): tất cả đạt. Chưa thử trên Supabase thật.

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
7. **Trang chủ bán hàng** `/` theo mockup `TrangChu.dc.html`: mở đầu có thẻ sơ đồ lớp bấm đổi bạn (ảnh ngày ấy – bây giờ), ô Vào lớp (nhận cả mã lẫn link dán vào, báo lỗi khi sai), 6 tính năng có hình minh họa (QR thật mở lớp mẫu; Hộp thư thời gian gắn nhãn "Sắp có"), so sánh Zalo, 3 mẫu giao diện, 4 bước, bảng giá, hỏi đáp dạng mở/đóng, khối đặt trang, chân trang.
   - **Mọi chữ, giá, số Zalo, tên hộ kinh doanh, địa chỉ, Facebook, cảm nhận khách** nằm trong `src/data/trangChu.ts`. Chưa điền thì trang hiện `[số điện thoại]`, `[Tên hộ kinh doanh]`, `[Địa chỉ]`; khối "Các lớp nói gì" tự ẩn khi `CAM_NHAN` rỗng.
   - Ảnh minh họa (tranh vẽ, không phải người thật) trong `public/trang-chu/`, vẽ lại bằng `scripts/anh-trang-chu/` (chạy `npx vite --port 5179` rồi `python3 scripts/anh-trang-chu/chay.py`).
   - Các trang khác tách gói (`React.lazy`), trang chủ nạp ~64KB gzip thay vì ~175KB. Thêm thẻ OG cho trang chủ trong `index.html`.
8. **Dữ liệu demo để thử:** nút "Nạp ảnh demo" vẽ ảnh hoạt hình trên trình duyệt (24 bạn mẫu, sơ đồ, ~14 ảnh xưa, chân dung, 2 buổi họp), chạy tiếp được từ chỗ dừng. Bật/tắt bằng `VITE_BAT_DEMO` trong `.env.production` (1 = bật, 0 = tắt). **Tắt trước khi bán cho khách.**

## 5. Đợt 1b đã làm (06/10/2026): vai trò và gửi ảnh chung

Theo `CLAUDE.md` mục 5 và 7. **Cần chạy `0006_lop_truong_gui_anh_chung.sql` trước khi dùng.**

**Vào lớp**
- Vào bằng mã lớp (link, QR, gõ ở trang chủ): không hỏi mật khẩu. Vào bằng tên gọi, hoặc lớp bật **"Luôn cần mật khẩu"** (công tắc ở trang quản trị lớp): hỏi mật khẩu.
- Lớp trưởng đã đăng nhập trên máy thì không bao giờ phải nhập mật khẩu lớp mình. Trên trang lớp, lớp trưởng thấy thanh nhỏ "Bạn là lớp trưởng · N ảnh chờ duyệt → Duyệt ảnh".
- Hàm dùng chung phía máy chủ: `quyen_vao_lop` trả `quan-tri | lop-truong | thanh-vien | can-mat-khau | tam-khoa`. `xem_lop` thêm tham số `p_token`.

**Trang gửi ảnh chung** `/:ma/gui-anh` (và `/:ma/q/:maQr`, `/:ma/gui-anh?buoi=<id>`)
- Chọn ảnh → "Ảnh này chụp hồi nào?": Thời đi học (6 mục) · Các lần họp lớp (buổi đã diễn ra) · Không nhớ rõ → chuyện hôm đó → tên → gửi. Phải chọn "hồi nào" mới gửi được.
- QR buổi họp chỉ chọn sẵn buổi đó; QR **không còn hết hạn** (bỏ ô khoảng ngày trong form buổi họp). QR vẫn gửi được khi lớp bật "Luôn cần mật khẩu".
- Ảnh thành viên: chờ duyệt. Ảnh lớp trưởng và quản trị: hiện ngay. "Không nhớ rõ" lưu `loai='xua', muc=null` (hiện ở mục Khác trên trang lớp; lớp trưởng lọc được "Chưa rõ" để xếp lại).
- Người gửi thấy khối **"Ảnh bạn đã gửi"** (máy lưu id ảnh, hàm `tinh_trang_anh`): đang chờ / đã lên trang / không đưa lên.
- Mỗi buổi trên dòng thời gian có nút "Gửi ảnh buổi này". `GuiAnhQr.tsx` đã gộp vào `GuiAnh.tsx`.

**Lớp trưởng** `/lop-truong`
- Đăng nhập SĐT (gõ +84, dấu cách đều được) + PIN 6 số. Sai 5 lần khóa 15 phút. Một lớp thì vào thẳng, hai lớp thì chọn.
- Máy nhớ bằng **token phiên** (180 ngày), không lưu PIN trên máy; máy chủ chỉ lưu mã băm của token. "Tạo PIN mới" đăng xuất mọi máy của SĐT đó.
- Một người một PIN: SĐT đã là lớp trưởng lớp khác thì dùng chung PIN đang có.
- Tab **Duyệt ảnh**: Chờ duyệt / Đã lên trang / Đã ẩn, lọc theo kho ảnh xưa / chưa rõ / từng buổi; chạm ảnh để xem lớn, duyệt hoặc ẩn rồi tự sang ảnh kế; đổi "chụp hồi nào"; đặt ảnh tập thể của buổi; "Duyệt tất cả".
- Tab **Buổi họp & mã QR**: thêm/sửa buổi, tờ QR A5 để in, gửi link vào Zalo. Chỉ xóa được buổi chưa có ảnh (buổi có ảnh thì nhờ chủ dịch vụ).
- Mọi hàm ghi (`lt_*`) kiểm token phía máy chủ và chỉ đụng tới dữ liệu lớp của token đó.

**Quản trị** `/quan-tri`
- Danh sách lớp: tên + SĐT lớp trưởng, nút Zalo, nhãn "N ảnh chờ duyệt"; ô tìm theo SĐT (vài số cuối, +84), mã lớp, tên gọi, tên lớp, trường, tỉnh, tên lớp trưởng (gõ không dấu được).
- Tạo lớp: nhập luôn lớp trưởng + lớp phó; hệ thống sinh PIN và soạn tin nhắn Zalo gửi riêng (chép một chạm, mở Zalo).
- Trang lớp: mục **Lớp trưởng** (tối đa 2: thêm, Tạo PIN mới, Xóa, Zalo); công tắc **Luôn cần mật khẩu**.
- Ảnh: một ô "Ảnh này chụp hồi nào" thay cho ô mục (chuyển được giữa mục ảnh xưa và các buổi).
- `/quan-tri` khi tài khoản chưa có quyền: lời nhắn thân thiện, chỉ đường sang trang lớp trưởng (không còn hiện câu SQL).

**Ghi chú kỹ thuật**
- Ảnh chờ duyệt ký link xem được (để lớp trưởng duyệt và người gửi xem lại); đường dẫn chứa uuid ngẫu nhiên chỉ lộ cho người gửi, lớp trưởng, quản trị. Ảnh đã ẩn: chỉ quản trị và lớp trưởng (trình duyệt gửi token qua header `x-hoplop-lt`, `cho_phep_xem_anh` đọc `request.headers`). **Cần thử trên Supabase thật**: nếu Storage không chuyển header này vào Postgres thì tab "Đã ẩn" của lớp trưởng chỉ hiện chữ "Ảnh" thay cho hình (vẫn bấm "Hiện lại" được); trang quản trị không bị ảnh hưởng.
- Bảng `quan_tri_lop` (quản trị lớp bằng email) để nguyên nhưng không còn dùng.
- Bảng mới `lop_truong`, `phien_lop_truong`, `lan_sai_pin` bật RLS, không có policy: chỉ hàm `security definer` đọc ghi.

**Cách thử sau khi chạy 0006**
1. Quản trị → một lớp → Lớp trưởng → thêm bằng SĐT của bạn → chép mã PIN.
2. Mở `/lop-truong` trên điện thoại (cửa sổ ẩn danh cũng được), đăng nhập.
3. Ở máy khác, mở `/<mã lớp>/gui-anh`, gửi 2 ảnh → thấy "Đang chờ duyệt"; lớp trưởng thấy 2 ảnh ở Chờ duyệt, duyệt một, ẩn một → kiểm tra tab Đã ẩn có hiện hình không (xem ghi chú header ở trên).
4. Tạo buổi họp ở trang lớp trưởng → tải tờ QR → quét bằng điện thoại.

## 5b. Đã làm thêm ngày 06/10 (chiều)

- **Hộp thư thời gian** trên trang lớp (khối cuối, `id="thu"`; nút "Viết thư cho lớp" ở ô Sắp họp lớp mở sẵn ô viết):
  - Hẹn mở vào một buổi họp sắp tới (theo ngày của buổi; buổi đổi ngày thì thư đổi theo), hoặc 1/5/10 năm nữa, hoặc tự chọn ngày. Ngày mở phải sau hôm nay (giờ Việt Nam).
  - Trước ngày mở, máy chủ không trả nội dung: trang chỉ hiện phong thư "N lá thư đang niêm phong · mở ngày … · còn N ngày · từ …". Máy nhớ thư mình đã viết ("có 1 thư của bạn").
  - Thư đã mở hiện trước, chữ viết tay theo giao diện lớp. Lớp mẫu `/xemmau` có 5 thư mẫu.
  - Quản trị → trang lớp → **Hộp thư thời gian**: xem nội dung (khi cần kiểm tra), Ẩn/Hiện, Xóa.
  - Trang chủ bỏ nhãn "Sắp có" ở tính năng này.
- **Tên gọi** (quản trị → trang lớp → Tên gọi): đặt, đổi hoặc bỏ. Link tên cũ tự chuyển sang tên mới (vẫn hỏi mật khẩu). Tên gọi không được giống dạng mã lớp 6 ký tự (tránh mã lớp sinh sau này trùng và cướp link). Bỏ tên gọi thì link tên cũ hết dùng: không bao giờ chuyển sang mã lớp, vì mã lớp vào được không cần mật khẩu.
- **Xóa dữ liệu demo** (quản trị → trang lớp → Dữ liệu demo, luôn hiện kể cả khi tắt `VITE_BAT_DEMO`): chỉ xóa ảnh có người gửi "Ảnh minh họa" (cả file trên kho), các bạn trùng cả họ tên + biệt danh + lưu bút với danh sách mẫu, và buổi họp minh họa chưa có ảnh thật.
- Trang chủ: điền tên **Công ty Cổ phần Phần mềm NEO**, địa chỉ **31LK6A Làng Việt Kiều Châu Âu, Hà Nội**. Câu "riêng tư" đổi cho đúng cách vào lớp mới.
- Đã thử: 0001→0007 trên Postgres cục bộ; bộ thử đầu-cuối 31 bước trên bản build (điện thoại 390px) đều đạt.

## 5c. Tái hiện và Góc thầy cô (06/10, tối)

- **Trang lớp** (sau "Năm nay – năm ngoái"): **Tái hiện** ("Chụp lại y như hồi ấy": ảnh xưa – ảnh nay đặt cạnh nhau, năm bên dưới, vài dòng kể, bấm để xem lớn) → Hộp thư thời gian → **Góc thầy cô** ("Những người đưa đò": ảnh, tên, "Chủ nhiệm · dạy Văn", câu thầy cô hay nói). Mục nào chưa có nội dung thì tự ẩn.
- Chỉ hiện cặp Tái hiện khi **cả hai** ảnh đã duyệt; ảnh thầy cô chưa duyệt thì hiện khung trống. Đọc qua hàm `xem_lop_them` (cùng quy tắc vào lớp như `xem_lop`).
- **Quản trị → trang lớp**: mục **Tái hiện** (thêm cặp: mỗi ảnh chọn trong kho của lớp hoặc tải ảnh mới; năm xưa, năm nay, vài dòng kể; sửa, xóa) và **Góc thầy cô** (họ tên kèm Thầy/Cô, vai trò, môn, câu nói, ảnh; sửa, xóa). Ảnh chọn ở đây tự được duyệt. Ảnh tải mới ở hai mục này lưu mục `chan-dung` nên không lẫn vào kho ảnh xưa.
- Lớp mẫu `/xemmau` có 1 cặp Tái hiện và 2 thầy cô mẫu (khung ảnh trống, tên để `[...]`).
- Bộ thử đầu-cuối: 35/35 bước đạt. Phần quản trị của hai mục này chưa thử tự động (cần đăng nhập email); chủ dự án thử tay.

## 5d. Lớp trưởng tự làm Tái hiện và Góc thầy cô (06/10, tối)

- Chủ dự án chốt: lớp trưởng và lớp phó (quyền như nhau) tự thêm/sửa/xóa Tái hiện và Góc thầy cô. Đã cập nhật bảng vai trò trong `CLAUDE.md` mục 5.
- Trang `/lop-truong` có tab thứ ba **"Tái hiện & thầy cô"**. Mỗi ô ảnh: "Chọn ảnh của lớp" (ảnh xưa hoặc ảnh buổi họp các bạn đã gửi) hoặc "Tải ảnh mới". Ảnh chọn vào đây tự được duyệt.
- Ảnh tải mới ở tab này thành ảnh riêng (mục `chan-dung`, không lẫn vào kho ảnh xưa) qua `lt_dat_anh_rieng`; hàm này chỉ áp dụng cho ảnh tải lên trong 1 giờ, để không giấu được ảnh cũ trong kho.
- Mọi hàm `lt_*` mới kiểm token phiên và chỉ nhận ảnh thuộc chính lớp đó. Quản trị vẫn làm được như trước.
- Bộ thử đầu-cuối: 39/39 bước đạt (thêm luồng lớp trưởng: chọn 1 ảnh của lớp + tải 1 ảnh mới thành cặp Tái hiện, thêm thầy cô có ảnh, kiểm tra trên trang lớp).

## 6. Việc tiếp theo

**Còn lại của Đợt 1:**
- Chạy `0006` và thử theo các bước trên; gửi ảnh chụp màn hình nếu có chỗ lạ.
- Chạy `0007`, `0008` (nếu chưa) và `0009`; thử Hộp thư, đổi tên gọi, Tái hiện, Góc thầy cô (cả ở quản trị và trang lớp trưởng).
- **Còn thiếu số Zalo** nhận đặt trang (`src/data/trangChu.ts`, mục `zalo`); thêm cảm nhận thật khi có lớp đầu tiên. Trang Chính sách bảo mật / Điều khoản (chưa có, nên chưa đặt link).
- Tắt `VITE_BAT_DEMO` khi thử xong, rồi bấm "Xóa dữ liệu demo" ở từng lớp thử.
- (Không gấp) Lớp trưởng ẩn thư không phù hợp ngay trên điện thoại (hiện chỉ quản trị làm được).
- (Không gấp) SMTP riêng cho email đăng nhập của chủ dịch vụ.

**Đợt 2 (theo `CLAUDE.md` mục 9):**
7. ~~Hộp thư thời gian, Tái hiện, Góc thầy cô~~ (đã làm)
8. Xuất zip toàn bộ ảnh gốc
9. Ngày hết hạn, chế độ chỉ xem, nhắc gia hạn
10. Tên miền riêng, OG tags cho bot (Cloudflare Pages Function)

**Ghi chú kỹ thuật chung:**
- Trong trang lớp, buổi họp hiện ở dòng thời gian khi ngày ≤ hôm nay **hoặc** đã có ảnh. Buổi tương lai chưa có ảnh chỉ hiện ở ô Sắp họp lớp; trang gửi ảnh cũng chỉ cho chọn buổi đã diễn ra (trừ buổi QR chọn sẵn).
- Ảnh chân dung (`muc = 'chan-dung'`) không hiện trong kho ảnh xưa, không hiện ở trang lớp trưởng; chỉ quản trị gửi được mục này.
- Đường dẫn ảnh: `lop/{lop_id}/{xua|chuong}/{anh_id}/{xem.jpg|goc.<đuôi>}`; bucket riêng tư, hiển thị bằng signed URL. Ảnh đổi buổi/mục không đổi đường dẫn.
- Tờ QR vẽ trong `src/lib/toQr.ts` (dùng chung quản trị và lớp trưởng).

## 7. Cách bắt đầu cuộc trò chuyện mới

Mở chat mới gắn với kho `dohoangdiep/hoplop`, rồi nhắn:

> Làm tiếp dự án ở kho https://github.com/dohoangdiep/hoplop. Đọc `CLAUDE.md` và `docs/TIEN_DO.md` trước, rồi làm tiếp: [việc tiếp theo].
