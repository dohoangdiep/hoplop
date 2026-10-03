import { supabase } from './supabase'
import type { Lop } from './types'
import { LOP_MAU, MA_LOP_MAU } from '../data/lopMau'

/**
 * Tìm lớp theo mã (6 ký tự) hoặc tên gọi.
 * Hiện tại: lớp mẫu trả về ngay; lớp thật đọc thông tin công khai tối thiểu từ Supabase.
 * Nội dung riêng tư (thành viên, ảnh…) sẽ lấy qua Edge Function `vao-lop` sau khi nhập mật khẩu (Đợt 1, mục 3).
 */
export async function timLop(maHoacTenGoi: string): Promise<Lop | null> {
  const khoa = maHoacTenGoi.toLowerCase()
  if (khoa === MA_LOP_MAU) return LOP_MAU

  const { data, error } = await supabase.rpc('tim_lop_cong_khai', { p_khoa: khoa })
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null
  const r = Array.isArray(data) ? data[0] : data
  return {
    id: r.id,
    ma: r.ma,
    tenGoi: r.ten_goi,
    tenLop: r.ten_lop,
    truong: r.truong,
    tinh: r.tinh,
    nienKhoaBatDau: r.nien_khoa_bat_dau,
    nienKhoaKetThuc: r.nien_khoa_ket_thuc,
    giaoDien: r.giao_dien,
    thanhVien: [],
    soDo: { soDay: 0, soBanMoiDay: 0, choMoiBan: 0, choNgoi: [] },
    chuong: [],
    khoAnhXua: [],
    soAnhDaLuu: 0,
  }
}
