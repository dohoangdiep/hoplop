import { supabase } from './supabase'
import { taoMaLop } from './maLop'
import type { MaGiaoDien } from '../themes'

export interface LopQuanTri {
  id: string
  ma: string
  ten_goi: string | null
  ten_lop: string
  truong: string
  tinh: string | null
  nien_khoa_bat_dau: number | null
  nien_khoa_ket_thuc: number | null
  giao_dien: MaGiaoDien
  trang_thai: string
  het_han: string | null
  tao_luc: string
}

const TU = ['hoaphuong', 'bangden', 'phantrang', 'aotrang', 'luubut', 'camtrai', 'begiang', 'santruong', 'thanhxuan', 'kyniem', 'trongtruong', 'cuoinam', 'tuoihoctro', 'banhoc', 'gioichoi']

/** Mật khẩu lớp dễ đọc qua Zalo: một từ + 3 chữ số, vd "hoaphuong482". */
export function taoMatKhauLop(): string {
  const b = new Uint32Array(2)
  crypto.getRandomValues(b)
  return TU[b[0] % TU.length] + String(b[1] % 1000).padStart(3, '0')
}

export async function laQuanTriHeThong(): Promise<boolean> {
  const { data, error } = await supabase.rpc('la_quan_tri_he_thong')
  return !error && data === true
}

export async function danhSachLop(): Promise<LopQuanTri[]> {
  const { data, error } = await supabase
    .from('lop')
    .select('id, ma, ten_goi, ten_lop, truong, tinh, nien_khoa_bat_dau, nien_khoa_ket_thuc, giao_dien, trang_thai, het_han, tao_luc')
    .order('tao_luc', { ascending: false })
  if (error) throw error
  return (data ?? []) as LopQuanTri[]
}

export async function layLop(id: string): Promise<LopQuanTri | null> {
  const { data, error } = await supabase
    .from('lop')
    .select('id, ma, ten_goi, ten_lop, truong, tinh, nien_khoa_bat_dau, nien_khoa_ket_thuc, giao_dien, trang_thai, het_han, tao_luc')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as LopQuanTri | null
}

export interface ThongTinLopMoi {
  tenLop: string
  truong: string
  tinh: string
  nienKhoaBatDau: number | null
  nienKhoaKetThuc: number | null
  giaoDien: MaGiaoDien
}

/** Tạo lớp: tự sinh mã (thử lại nếu trùng), đặt mật khẩu, tạo sơ đồ mặc định. */
export async function taoLop(tt: ThongTinLopMoi): Promise<{ lop: LopQuanTri; matKhau: string }> {
  let lop: LopQuanTri | null = null
  for (let lan = 0; lan < 5 && !lop; lan++) {
    const { data, error } = await supabase
      .from('lop')
      .insert({
        ma: taoMaLop(),
        ten_lop: tt.tenLop.trim(),
        truong: tt.truong.trim(),
        tinh: tt.tinh.trim() || null,
        nien_khoa_bat_dau: tt.nienKhoaBatDau,
        nien_khoa_ket_thuc: tt.nienKhoaKetThuc,
        giao_dien: tt.giaoDien,
      })
      .select()
      .single()
    if (!error) lop = data as LopQuanTri
    else if (error.code !== '23505') throw error // 23505 = trùng mã, thử mã khác
  }
  if (!lop) throw new Error('Không tạo được mã lớp, thử lại sau.')

  const matKhau = taoMatKhauLop()
  await datMatKhau(lop.id, matKhau)
  await supabase.from('so_do').insert({ lop_id: lop.id })
  return { lop, matKhau }
}

export async function datMatKhau(lopId: string, matKhau: string) {
  const { error } = await supabase.rpc('dat_mat_khau_lop', { p_lop: lopId, p_mat_khau: matKhau })
  if (error) throw error
}

export async function capNhatLop(id: string, thayDoi: Partial<Pick<LopQuanTri, 'giao_dien' | 'trang_thai' | 'ten_goi' | 'het_han'>>) {
  const { error } = await supabase.from('lop').update(thayDoi).eq('id', id)
  if (error) throw error
}
