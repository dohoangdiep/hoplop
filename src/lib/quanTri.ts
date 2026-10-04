import { linkXemNhieu } from './storage'
import { guiAnh } from './guiAnh'
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

/* ---------------- Thành viên ---------------- */
export interface ThanhVienQT {
  id: string
  ho_ten: string
  ten_goi_tat: string | null
  biet_danh: string | null
  noi_o: string | null
  cau_luu_but: string | null
  an_thong_tin: boolean
  thu_tu: number
  anh_xua_id: string | null
  anh_nay_id: string | null
}

export async function dsThanhVien(lopId: string): Promise<ThanhVienQT[]> {
  const { data, error } = await supabase
    .from('thanh_vien')
    .select('id, ho_ten, ten_goi_tat, biet_danh, noi_o, cau_luu_but, an_thong_tin, thu_tu, anh_xua_id, anh_nay_id')
    .eq('lop_id', lopId)
    .order('thu_tu').order('ho_ten')
  if (error) throw error
  return (data ?? []) as ThanhVienQT[]
}

/**
 * Dán danh sách, mỗi dòng một bạn:
 *   Họ tên | biệt danh | nơi ở | câu lưu bút   (chỉ Họ tên là bắt buộc)
 * Tên gọi tắt tự lấy chữ cuối của họ tên.
 */
export function phanTichDanhSach(van: string) {
  return van
    .split('\n')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const [hoTen, bietDanh, noiO, cauLuuBut] = d.split('|').map((x) => x.trim())
      const hoTenSach = hoTen.replace(/^\d+[.)]\s*/, '') // bỏ số thứ tự "1. " nếu có
      return {
        ho_ten: hoTenSach,
        ten_goi_tat: hoTenSach.split(/\s+/).pop() ?? hoTenSach,
        biet_danh: bietDanh || null,
        noi_o: noiO || null,
        cau_luu_but: cauLuuBut || null,
      }
    })
    .filter((t) => t.ho_ten)
}

export async function themThanhVien(lopId: string, ds: ReturnType<typeof phanTichDanhSach>, batDauTu: number) {
  if (!ds.length) return
  const { error } = await supabase
    .from('thanh_vien')
    .insert(ds.map((t, i) => ({ ...t, lop_id: lopId, thu_tu: batDauTu + i })))
  if (error) throw error
}

export async function suaThanhVien(id: string, thayDoi: Partial<Omit<ThanhVienQT, 'id'>>) {
  const { error } = await supabase.from('thanh_vien').update(thayDoi).eq('id', id)
  if (error) throw error
}

export async function xoaThanhVien(id: string) {
  const { error } = await supabase.from('thanh_vien').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- Sơ đồ chỗ ngồi ---------------- */
export interface SoDoQT {
  so_day: number
  so_ban_moi_day: number
  cho_moi_ban: number
  cho: Record<string, string | null> // khóa "day-ban-viTri" -> thanh_vien_id
}

export const khoaCho = (d: number, b: number, v: number) => `${d}-${b}-${v}`

export async function laySoDo(lopId: string): Promise<SoDoQT> {
  const [{ data: s }, { data: c, error }] = await Promise.all([
    supabase.from('so_do').select('so_day, so_ban_moi_day, cho_moi_ban').eq('lop_id', lopId).maybeSingle(),
    supabase.from('cho_ngoi').select('day, ban, vi_tri, thanh_vien_id').eq('lop_id', lopId),
  ])
  if (error) throw error
  const cho: SoDoQT['cho'] = {}
  for (const r of c ?? []) cho[khoaCho(r.day, r.ban, r.vi_tri)] = r.thanh_vien_id
  return { so_day: s?.so_day ?? 5, so_ban_moi_day: s?.so_ban_moi_day ?? 3, cho_moi_ban: s?.cho_moi_ban ?? 2, cho }
}

export async function luuSoDo(lopId: string, sd: SoDoQT) {
  const { error: e1 } = await supabase
    .from('so_do')
    .upsert({ lop_id: lopId, so_day: sd.so_day, so_ban_moi_day: sd.so_ban_moi_day, cho_moi_ban: sd.cho_moi_ban })
  if (e1) throw e1
  const { error: e2 } = await supabase.from('cho_ngoi').delete().eq('lop_id', lopId)
  if (e2) throw e2
  const hang = Object.entries(sd.cho)
    .filter(([, tv]) => tv)
    .map(([k, tv]) => {
      const [day, ban, vi_tri] = k.split('-').map(Number)
      return { lop_id: lopId, day, ban, vi_tri, thanh_vien_id: tv }
    })
    .filter((h) => h.day < sd.so_day && h.ban < sd.so_ban_moi_day && h.vi_tri < sd.cho_moi_ban)
  if (hang.length) {
    const { error: e3 } = await supabase.from('cho_ngoi').insert(hang)
    if (e3) throw e3
  }
}

/* ---------------- Ảnh ---------------- */
export interface AnhQT {
  id: string
  loai: 'xua' | 'chuong'
  muc: string | null
  chu_thich: string | null
  nguoi_gui_ten: string | null
  trang_thai: 'cho-duyet' | 'da-duyet' | 'an'
  duong_dan_xem: string
  duong_dan_goc: string
  tao_luc: string
}

export async function dsAnh(lopId: string): Promise<AnhQT[]> {
  const { data, error } = await supabase
    .from('anh')
    .select('id, loai, muc, chu_thich, nguoi_gui_ten, trang_thai, duong_dan_xem, duong_dan_goc, tao_luc')
    .eq('lop_id', lopId)
    .eq('da_tai_xong', true)
    .order('tao_luc', { ascending: false })
  if (error) throw error
  return (data ?? []) as AnhQT[]
}

export async function capNhatAnh(id: string, thayDoi: Partial<Pick<AnhQT, 'trang_thai' | 'muc' | 'chu_thich'>>) {
  const { error } = await supabase.from('anh').update(thayDoi).eq('id', id)
  if (error) throw error
}

export async function capNhatNhieuAnh(ids: string[], thayDoi: Partial<Pick<AnhQT, 'trang_thai' | 'muc'>>) {
  if (!ids.length) return
  const { error } = await supabase.from('anh').update(thayDoi).in('id', ids)
  if (error) throw error
}

/** Gắn ảnh làm "ngày ấy" hoặc "bây giờ" của một bạn (ảnh tự được duyệt). */
export async function ganAnhChoBan(thanhVienId: string, kieu: 'anh_xua_id' | 'anh_nay_id', anhId: string) {
  await capNhatAnh(anhId, { trang_thai: 'da-duyet' })
  const { error } = await supabase.from('thanh_vien').update({ [kieu]: anhId }).eq('id', thanhVienId)
  if (error) throw error
}

export async function datAnhBia(lopId: string, anhId: string) {
  await capNhatAnh(anhId, { trang_thai: 'da-duyet' })
  const { error } = await supabase.from('lop').update({ anh_bia_id: anhId }).eq('id', lopId)
  if (error) throw error
}

/** Ký link xem cho ảnh chân dung của các bạn. Trả về map anh_id -> url. */
export async function linkAnhThanhVien(ds: ThanhVienQT[]): Promise<Record<string, string>> {
  const ids = ds.flatMap((t) => [t.anh_xua_id, t.anh_nay_id]).filter(Boolean) as string[]
  if (!ids.length) return {}
  const { data } = await supabase.from('anh').select('id, duong_dan_xem').in('id', ids)
  const link = await linkXemNhieu((data ?? []).map((a) => a.duong_dan_xem))
  return Object.fromEntries((data ?? []).map((a) => [a.id, link[a.duong_dan_xem]]).filter(([, u]) => u))
}

/** Tải một ảnh từ máy lên làm ảnh "ngày ấy" hoặc "bây giờ" của một bạn. */
export async function taiAnhChoBan(lopMa: string, tv: ThanhVienQT, kieu: 'anh_xua_id' | 'anh_nay_id', file: File) {
  const r = await guiAnh([file], {
    khoa: lopMa, muc: 'chan-dung', nguoiGui: 'Ban liên lạc',
    chuThich: `${tv.ho_ten} ${kieu === 'anh_xua_id' ? 'ngày ấy' : 'bây giờ'}`,
  }, () => {})
  if (r.loi) throw new Error(r.loi)
  if (!r.ids[0]) throw new Error('Tải ảnh không thành công, bạn thử lại nhé.')
  await ganAnhChoBan(tv.id, kieu, r.ids[0])
}
