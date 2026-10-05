/**
 * Nội dung trang chủ bán hàng. Sửa chữ, giá, số điện thoại ở đây, không cần đụng vào component.
 * Chỗ nào chưa có thông tin thật thì để trống: trang tự hiện [...] hoặc ẩn khối đó.
 */

export const LIEN_HE = {
  /** Số Zalo nhận đặt trang, chỉ chữ số, ví dụ '0912345678'. Để trống thì nút hiện [số điện thoại]. */
  zalo: '',
  tenHoKinhDoanh: '',
  diaChi: '',
  facebook: '',
}

export const zaloLink = () => (LIEN_HE.zalo ? `https://zalo.me/${LIEN_HE.zalo.replace(/\D/g, '')}` : '')

export type MaTinhNang = 'so-do' | 'kho-anh' | 'gap-lai' | 'nam-nay' | 'hop-thu' | 'qr'

export const TINH_NANG: { ma: MaTinhNang; tieuDe: string; moTa: string; sapCo?: boolean }[] = [
  { ma: 'so-do', tieuDe: 'Sơ đồ chỗ ngồi', moTa: 'Chạm vào chỗ ngồi của từng bạn để xem ảnh ngày ấy, bây giờ, biệt danh và câu lưu bút.' },
  { ma: 'kho-anh', tieuDe: 'Kho ảnh xưa', moTa: 'Cả lớp cùng góp ảnh cũ, xếp theo lớp 10, 11, 12, cắm trại, bế giảng. Mỗi năm lại tìm thêm được ảnh mới.' },
  { ma: 'gap-lai', tieuDe: 'Những lần gặp lại', moTa: 'Mỗi buổi họp lớp là một chương: ảnh tập thể, album, video ngắn của năm đó.' },
  { ma: 'nam-nay', tieuDe: 'Năm nay – năm ngoái', moTa: 'Ảnh tập thể các năm đặt cạnh nhau để thấy cả lớp đã thay đổi thế nào.' },
  { ma: 'qr', tieuDe: 'QR gửi ảnh tại buổi họp', moTa: 'Đặt một mã QR trên bàn tiệc. Ai chụp gì cũng gửi thẳng vào album của năm đó, không cần cài app.' },
  { ma: 'hop-thu', tieuDe: 'Hộp thư thời gian', moTa: 'Viết thư cho cả lớp, hẹn đến lần họp 25 hay 30 năm mới mở.', sapCo: true },
]

export const ZALO_SO_VOI_TRANG = {
  zalo: ['Ảnh bị nén mờ', 'Trôi mất sau vài trăm tin nhắn', 'Ảnh hết hạn, không tải lại được', 'Mỗi người giữ một ít, không ai đủ'],
  trang: ['Giữ ảnh gốc, tải về bất cứ lúc nào', 'Xếp theo năm, theo từng lần họp', 'Gắn tên từng bạn trong ảnh', 'Riêng tư, có mật khẩu lớp'],
}

export const BUOC = [
  { tieuDe: 'Nhắn đặt trang', moTa: 'Ban liên lạc nhắn Zalo, chọn gói và đặt cọc.' },
  { tieuDe: 'Cả lớp gửi tư liệu', moTa: 'Một link duy nhất đăng vào nhóm lớp. Ai còn giữ ảnh xưa thì gửi, không cần tài khoản.' },
  { tieuDe: 'Nhận trang sau 7–10 ngày', moTa: 'Chúng tôi lọc ảnh, dựng sơ đồ lớp và gửi bản xem trước để lớp góp ý.' },
  { tieuDe: 'Mỗi năm thêm một chương', moTa: 'In QR đặt ở buổi họp. Ảnh hôm đó vào thẳng chương mới của lớp.' },
]

export const GOI = {
  namDau: {
    gia: '1.500.000đ',
    ghiChu: 'Dựng trang trọn gói, lớp đến 60 bạn',
    gom: ['Sơ đồ chỗ ngồi, ảnh ngày ấy – bây giờ', 'Kho ảnh xưa, lọc và xếp hộ', 'Chương họp lớp đầu tiên, QR gửi ảnh', 'Mật khẩu lớp, 2 tài khoản duyệt ảnh', 'Sửa 2 lần trước khi bàn giao'],
  },
  giaHan: {
    gia: '500.000đ',
    ghiChu: 'Gia hạn đúng dịp họp lớp',
    gom: ['Chương mới cho buổi họp năm đó', 'QR gửi ảnh mới, lọc ảnh hộ', 'Video tổng hợp ngắn của năm', 'Mở các thư hẹn giờ đến hạn', 'Trả trước 3 năm: 1.200.000đ'],
  },
  them: [
    ['Tên miền riêng cho lớp', 'từ 500.000đ'],
    ['Số hóa ảnh giấy', 'từ 5.000đ/ảnh'],
    ['Năm kỷ niệm 25, 30 năm', 'từ 1.000.000đ'],
    ['Hội khóa nhiều lớp', 'Báo giá riêng'],
  ] as [string, string][],
}

/** Cảm nhận thật của các lớp. Chưa có thì để mảng rỗng, khối này sẽ ẩn. Không bịa. */
export const CAM_NHAN: { loi: string; lop: string }[] = []

export const HOI_DAP = [
  { hoi: 'Trang có riêng tư không?', dap: 'Mỗi lớp có địa chỉ riêng và mật khẩu riêng, không hiện trên Google. Ảnh gửi lên được ban liên lạc duyệt trước khi hiện.' },
  { hoi: 'Lớp tôi không ai rành công nghệ thì sao?', dap: 'Không sao. Cả lớp chỉ cần bấm link hoặc quét QR để xem và gửi ảnh. Phần dựng trang chúng tôi làm hộ.' },
  { hoi: 'Ảnh được lưu bao lâu?', dap: 'Suốt thời gian lớp còn gia hạn. Ảnh gốc được giữ nguyên chất lượng và tải về được bất cứ lúc nào.' },
  { hoi: 'Ngừng gia hạn thì ảnh đi đâu?', dap: 'Trang chuyển sang chỉ xem trong 6 tháng, lớp tải toàn bộ ảnh về máy. Muốn quay lại thì khôi phục được.' },
  { hoi: 'Có phải cài ứng dụng không?', dap: 'Không. Trang mở trên trình duyệt của điện thoại, vào từ link Zalo hoặc quét QR là xem được.' },
  { hoi: 'Đăng ký tham dự, thu tiền có làm trên trang không?', dap: 'Không. Việc đó lớp vẫn làm trên nhóm Zalo như mọi năm. Trang chỉ lo giữ kỷ niệm.' },
]

/** Sáu bạn trong thẻ minh họa đầu trang (ảnh vẽ minh họa trong public/trang-chu). */
export const BAN_MINH_HOA = [
  { anh: 'hung', ten: 'Hùng', bietDanh: 'Hùng Còi', luuBut: 'Ai đi xa nhất thì phải về sớm nhất!' },
  { anh: 'lan', ten: 'Lan', bietDanh: 'Lan Béo', luuBut: 'Nhớ mãi mùa phượng năm ấy.' },
  { anh: 'tuan', ten: 'Tuấn', bietDanh: 'Tuấn Đen', luuBut: 'Lớp mình mãi là số một.' },
  { anh: 'mai', ten: 'Mai', bietDanh: 'Mai Mực', luuBut: 'Đừng quên nhau nhé.' },
  { anh: 'dung', ten: 'Dũng', bietDanh: 'Dũng Xoăn', luuBut: 'Ra trường rồi vẫn nợ cô bài kiểm tra.' },
  { anh: 'ha', ten: 'Hà', bietDanh: 'Hà Kều', luuBut: 'Thanh xuân là có các cậu.' },
]
