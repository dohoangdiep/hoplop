import type { LaThu } from '../lib/thu'
import type { TaiHien, ThayCo } from '../lib/types'
import type { Lop, ThanhVien, ChoNgoi } from '../lib/types'

/** Lớp mẫu công khai để khách xem thử. Dữ liệu giả, không phải người thật. */
const NGUOI: [string, string, string, string, string][] = [
  ['Hùng', 'Nguyễn Văn Hùng', 'Hùng Còi', 'Đà Nẵng', 'Ai đi xa nhất thì phải về sớm nhất!'],
  ['Lan', 'Phạm Thị Lan', 'Lan Béo', 'Hà Nội', 'Nhớ mãi mùa phượng năm ấy.'],
  ['Tuấn', 'Lê Anh Tuấn', 'Tuấn Đen', 'TP.HCM', 'Lớp mình mãi là số một.'],
  ['Mai', 'Đỗ Thị Mai', 'Mai Mực', 'Hà Nội', 'Đừng quên nhau nhé.'],
  ['Dũng', 'Trần Quốc Dũng', 'Dũng Xoăn', 'Hải Phòng', 'Ra trường rồi vẫn nợ cô bài kiểm tra.'],
  ['Hà', 'Vũ Thu Hà', 'Hà Kều', 'Hà Nội', 'Thanh xuân là có các cậu.'],
  ['Nam', 'Bùi Hoài Nam', 'Nam Toán', 'Singapore', 'Giải xong đề rồi mới được về.'],
  ['Long', 'Đặng Văn Long', 'Long Mập', 'Hà Nội', 'Ai trực nhật hôm nay?'],
  ['Thảo', 'Ngô Phương Thảo', 'Thảo Lớp Phó', 'Hà Nội', 'Sổ đầu bài vẫn còn đây.'],
  ['Quân', 'Hoàng Minh Quân', 'Quân Bóng', 'Đà Nẵng', 'Chiều nay đá bóng không?'],
  ['Ngọc', 'Lý Bảo Ngọc', 'Ngọc Nhí', 'Hà Nội', 'Cười lên nào!'],
  ['Phong', 'Phan Thanh Phong', 'Phong Guitar', 'Huế', 'Hát lại bài năm ấy đi.'],
  ['Huyền', 'Mạc Thu Huyền', 'Huyền Tóc Dài', 'Hà Nội', 'Nhớ căng tin cô Tư.'],
  ['Đức', 'Tạ Minh Đức', 'Đức Ngủ Gật', 'TP.HCM', 'Tiết đầu là để ngủ.'],
  ['Linh', 'Cao Mỹ Linh', 'Linh Lém', 'Hà Nội', 'Hẹn nhau mùng 4 Tết.'],
  ['Khoa', 'Đinh Đăng Khoa', 'Khoa Kính', 'Hà Nội', 'Mượn vở chép bài với.'],
  ['Trang', 'Lương Thu Trang', 'Trang Văn', 'Bắc Ninh', 'Bài văn cuối cùng viết về các cậu.'],
  ['Sơn', 'Kiều Hải Sơn', 'Sơn Lớp Trưởng', 'Hà Nội', 'Cả lớp trật tự!'],
  ['Yến', 'Hồ Hải Yến', 'Yến Nhút Nhát', 'Úc', 'Xa mấy cũng nhớ lớp.'],
  ['Việt', 'Chu Quốc Việt', 'Việt Chạy', 'Hà Nội', 'Ai về chậm nhất thì trả tiền.'],
  ['Hoa', 'Mai Thị Hoa', 'Hoa Phượng', 'Nghệ An', 'Phượng vẫn nở mỗi tháng Năm.'],
  ['Bình', 'Triệu Thanh Bình', 'Bình Bóng Bàn', 'Hà Nội', 'Chơi một ván nữa thôi.'],
  ['Vy', 'Âu Tường Vy', 'Vy Vẽ', 'Hà Nội', 'Vẽ lại sơ đồ lớp này là tớ đấy.'],
  ['Kiên', 'Lâm Trung Kiên', 'Kiên Đô', 'Hải Dương', 'Năm sau tớ bao.'],
  ['Nga', 'Thân Thúy Nga', 'Nga Cận', 'Hà Nội', 'Nhớ ngồi bàn đầu không?'],
  ['Hải', 'Vương Đức Hải', 'Hải Hát', 'TP.HCM', 'Năm nay tớ nhất định về.'],
  ['Thu', 'Ninh Hoài Thu', 'Thu Thủ Quỹ', 'Hà Nội', 'Quỹ lớp vẫn còn nhé!'],
  ['Toàn', 'Quách Văn Toàn', 'Toàn Lí', 'Hà Nội', 'Định luật thứ ba của tình bạn.'],
  ['Châu', 'Doãn Minh Châu', 'Châu Nhỏ', 'Đà Lạt', 'Gửi các cậu chút hoa Đà Lạt.'],
  ['Lực', 'Tống Văn Lực', 'Lực Sĩ', 'Hà Nội', 'Khiêng bàn để tớ.'],
]

const thanhVien: ThanhVien[] = NGUOI.map(([tenGoiTat, hoTen, bietDanh, noiO, cauLuuBut], i) => ({
  id: `tv${i}`,
  tenGoiTat,
  hoTen,
  bietDanh,
  noiO,
  cauLuuBut,
}))

const choNgoi: ChoNgoi[] = []
for (let day = 0; day < 5; day++)
  for (let ban = 0; ban < 3; ban++)
    for (let viTri = 0; viTri < 2; viTri++)
      choNgoi.push({ day, ban, viTri, thanhVienId: `tv${day * 6 + ban * 2 + viTri}` })

const muc = (ma: string, ten: string, ds: string[]) => ({
  ma,
  ten,
  anh: ds.map((chuThich, i) => ({ id: `${ma}-${i}`, chuThich })),
})

export const MA_LOP_MAU = 'xemmau'

export const LOP_MAU: Lop = {
  id: 'lop-mau',
  ma: MA_LOP_MAU,
  tenLop: '12A1',
  truong: 'THPT [Tên trường]',
  nienKhoaBatDau: 2003,
  nienKhoaKetThuc: 2006,
  giaoDien: 'hoai-niem',
  cap: 'thpt',
  thanhVien,
  soDo: { soDay: 5, soBanMoiDay: 3, choMoiBan: 2, choNgoi },
  chuong: [
    { id: 'c4', tieuDe: 'Họp lớp 21 năm · Mùng 4 Tết', ngay: '2027-02-10', diaDiem: 'Nhà hàng [Tên nhà hàng]', sapToi: true },
    { id: 'c3', tieuDe: 'Họp lớp 20 năm · Tết Bính Ngọ', ngay: '2026-02-20', soNguoi: 36, soAnh: 412 },
    { id: 'c2', tieuDe: 'Họp lớp 19 năm · Tết Ất Tỵ', ngay: '2025-02-01', soNguoi: 31, soAnh: 287 },
    { id: 'c1', tieuDe: 'Ngày bế giảng', ngay: '2006-05-25', soNguoi: 42, soAnh: 453 },
  ],
  khoAnhXua: [
    muc('lop-10', 'Lớp 10', ['Khai giảng 2003', 'Trực nhật đầu tiên', 'Văn nghệ 20/11', 'Tổ 3 thi đua', 'Giờ ra chơi', 'Ảnh thẻ cả lớp']),
    muc('lop-11', 'Lớp 11', ['Hội trại 26/3', 'Đội bóng lớp', 'Thi hát tập thể', 'Sinh nhật Lan', 'Lao động trồng cây', 'Tết 2005']),
    muc('lop-12', 'Lớp 12', ['Ôn thi khối A', 'Chụp kỷ yếu', 'Áo trắng sân trường', 'Viết lưu bút', 'Hàng phượng', 'Bế giảng 2006']),
    muc('cam-trai', 'Cắm trại', ['Ba Vì 2005', 'Dựng lều', 'Lửa trại', 'Tháp người', 'Nấu cơm nồi đất', 'Về muộn']),
    muc('be-giang', 'Bế giảng', ['Tặng hoa cô', 'Ảnh tập thể', 'Ký lên áo', 'Cổng trường', 'Bàn cuối lớp', 'Lần cuối mặc áo trắng']),
  ],
  soAnhDaLuu: 1248,
}

/** Thư mẫu cho Hộp thư thời gian của lớp mẫu (nội dung minh họa) */
export const THU_MAU: LaThu[] = [
  { id: 't1', nguoiViet: 'Lan Béo', taoLuc: '2025-02-01', ngayMo: '2026-02-20', buoi: 'Họp lớp 20 năm · Tết Bính Ngọ', daMo: true,
    noiDung: 'Gửi cả lớp của năm sau: hy vọng lúc mở thư này, bàn cuối vẫn ồn nhất và Hùng vẫn về muộn nhất. Nhớ mang ảnh cũ đi nhé!' },
  { id: 't2', nguoiViet: 'Sơn Lớp Trưởng', taoLuc: '2025-02-01', ngayMo: '2026-02-20', buoi: 'Họp lớp 20 năm · Tết Bính Ngọ', daMo: true,
    noiDung: 'Hai mươi năm rồi. Cảm ơn các bạn đã luôn quay về. Năm nay điểm danh đủ 40 bạn thì tớ khao cả lớp.' },
  { id: 't3', nguoiViet: 'Mai Mực', taoLuc: '2026-02-20', ngayMo: '2027-02-10', buoi: 'Họp lớp 21 năm · Mùng 4 Tết', daMo: false, noiDung: null },
  { id: 't4', nguoiViet: 'Nam Toán', taoLuc: '2026-02-20', ngayMo: '2027-02-10', buoi: 'Họp lớp 21 năm · Mùng 4 Tết', daMo: false, noiDung: null },
  { id: 't5', nguoiViet: 'Hà Kều', taoLuc: '2026-02-21', ngayMo: '2031-02-20', buoi: null, daMo: false, noiDung: null },
]

/** Tái hiện và Góc thầy cô của lớp mẫu (nội dung minh họa, khung ảnh để trống) */
export const TAI_HIEN_MAU: TaiHien[] = [
  { id: 'th1', namXua: 2005, namNay: 2026, nhanXua: '[Cắm trại Ba Vì]', nhanNay: '[Cùng tư thế]',
    chuThich: 'Sáu bạn nam xếp hình tháp người, 21 năm sau vẫn đủ người, chỉ là tháp thấp hơn một chút.' },
]
export const THAY_CO_MAU: ThayCo[] = [
  { id: 'tc1', hoTen: 'Cô [Họ tên cô chủ nhiệm]', vaiTro: 'Chủ nhiệm', mon: 'Văn', cauNoi: 'Các em cứ đi xa, nhưng nhớ đường về lớp.' },
  { id: 'tc2', hoTen: 'Thầy [Họ tên thầy dạy Toán]', mon: 'Toán', cauNoi: 'Bài khó thì làm từng bước một.' },
]
