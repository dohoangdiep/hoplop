/**
 * Hộp thư thời gian: viết thư cho cả lớp, hẹn mở vào một buổi họp sau hoặc một ngày.
 * Trước ngày mở, máy chủ không trả nội dung thư (chỉ tên người viết và ngày mở).
 */
import { supabase } from './supabase'
import { matKhauDaLuu } from './lop'
import { tokenLopTruong } from './lopTruong'

export interface LaThu {
  id: string
  nguoiViet: string
  taoLuc: string
  ngayMo: string | null
  buoi: string | null
  daMo: boolean
  noiDung: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chuyen = (t: any): LaThu => ({
  id: t.id, nguoiViet: t.nguoi_viet ?? '', taoLuc: t.tao_luc, ngayMo: t.ngay_mo ?? null,
  buoi: t.buoi ?? null, daMo: !!t.da_mo, noiDung: t.noi_dung ?? null,
})

/** null: không đọc được (chưa vào được lớp, hoặc cơ sở dữ liệu chưa chạy file 0007) */
export async function thuCuaLop(khoa: string): Promise<{ thu: LaThu[]; homNay: string } | null> {
  const { data, error } = await supabase.rpc('thu_cua_lop', { p_khoa: khoa, p_mat_khau: matKhauDaLuu(khoa), p_token: tokenLopTruong() })
  if (error || !data || data.loi) return null
  return { thu: (data.thu ?? []).map(chuyen), homNay: data.hom_nay }
}

const LOI: Record<string, string> = {
  ten: 'Bạn ký tên dưới lá thư nhé (tối đa 60 ký tự).',
  trong: 'Lá thư còn trống, bạn viết vài dòng nhé.',
  dai: 'Thư dài quá rồi, bạn viết gọn trong khoảng 3.000 ký tự nhé.',
  ngay: 'Ngày mở thư phải sau hôm nay.',
  'buoi-sai': 'Không tìm thấy buổi họp này, bạn tải lại trang nhé.',
  'buoi-chua-co-ngay': 'Buổi họp này chưa có ngày, bạn chọn một ngày mở thư nhé.',
  'qua-nhieu': 'Lớp vừa nhận nhiều thư quá, bạn đợi ít phút rồi gửi nhé.',
  'chi-xem': 'Trang lớp đang ở chế độ chỉ xem nên tạm ngừng nhận thư.',
  'can-mat-khau': 'Bạn cần vào trang lớp bằng mật khẩu trước.',
  'tam-khoa': 'Có nhiều lần nhập sai mật khẩu, bạn đợi khoảng 10 phút nhé.',
}

export async function vietThu(khoa: string, o: { nguoiViet: string; noiDung: string; chuongId?: string | null; ngay?: string | null }):
  Promise<{ ok: true; ngayMo: string } | { ok: false; loi: string }> {
  const { data, error } = await supabase.rpc('viet_thu', {
    p_khoa: khoa, p_nguoi_viet: o.nguoiViet, p_noi_dung: o.noiDung,
    p_chuong_id: o.chuongId ?? null, p_ngay: o.chuongId ? null : o.ngay ?? null,
    p_mat_khau: matKhauDaLuu(khoa), p_token: tokenLopTruong(),
  })
  if (error) return { ok: false, loi: error.code === 'PGRST202' ? 'Cơ sở dữ liệu chưa được cập nhật: cần chạy file SQL 0007.' : 'Không kết nối được, bạn thử lại nhé.' }
  if (data?.loi) return { ok: false, loi: LOI[data.loi] ?? 'Có lỗi, bạn thử lại nhé.' }
  ghiThuCuaToi(khoa, data.id)
  return { ok: true, ngayMo: data.ngay_mo }
}

/* Máy nhớ id các lá thư mình đã viết, để hiện "thư của bạn" trong hộp thư */
const khoa = (k: string) => `hoplop:thu:${k.toLowerCase()}`
export function thuCuaToi(k: string): string[] {
  try { return JSON.parse(localStorage.getItem(khoa(k)) ?? '[]') } catch { return [] }
}
function ghiThuCuaToi(k: string, id: string) {
  try { localStorage.setItem(khoa(k), JSON.stringify([id, ...thuCuaToi(k)].slice(0, 50))) } catch { /* bỏ qua */ }
}

/** "2027-02-10" -> "10/2/2027" */
export const ngayVN = (iso: string | null) => (iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('vi-VN') : '')

/** Ngày sau hôm nay n năm (giữ ngày/tháng), dạng yyyy-mm-dd theo giờ máy */
export function sauNam(n: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
