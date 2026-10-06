/**
 * Lớp trưởng: đăng nhập SĐT + PIN, máy nhớ phiên (token), các thao tác duyệt ảnh và buổi họp.
 * Mọi hàm ghi đều đi qua hàm Postgres kiểm token phía máy chủ.
 */
import { supabase } from './supabase'
import type { MaGiaoDien } from '../themes'

export interface LopCuaToi {
  id: string
  ma: string
  ten_lop: string
  truong: string
  giao_dien: MaGiaoDien
  nien_khoa_ket_thuc: number | null
  ho_ten: string
  so_cho_duyet: number
}

const KHOA = 'hoplop:lt'

export function tokenLopTruong(): string | null {
  try { return localStorage.getItem(KHOA) } catch { return null }
}
function luuToken(t: string | null) {
  try { t ? localStorage.setItem(KHOA, t) : localStorage.removeItem(KHOA) } catch { /* bỏ qua */ }
}

/** "+84 912 345 678", "0912.345.678" -> "0912345678" (giống hàm chuan_hoa_sdt phía máy chủ) */
export function chuanHoaSdt(s: string): string {
  const d = s.replace(/\D/g, '')
  if (/^84[1-9]\d{8}$/.test(d)) return '0' + d.slice(2)
  if (/^[1-9]\d{8}$/.test(d)) return '0' + d
  return d
}

export const hienSdt = (sdt: string) => sdt.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3')

export type KetQuaDangNhap =
  | { ok: true; lop: LopCuaToi[] }
  | { ok: false; loi: string }

export async function dangNhap(sdt: string, pin: string): Promise<KetQuaDangNhap> {
  const { data, error } = await supabase.rpc('dang_nhap_lop_truong', { p_sdt: sdt, p_pin: pin.trim() })
  if (error || !data) return { ok: false, loi: 'Không kết nối được, bạn thử lại nhé.' }
  if (data.loi === 'sdt') return { ok: false, loi: 'Số điện thoại chưa đúng, bạn kiểm tra lại nhé.' }
  if (data.loi === 'tam-khoa') return { ok: false, loi: 'Nhập sai nhiều lần nên tạm khóa 15 phút. Bạn đợi một lát rồi thử lại, hoặc nhắn chủ dịch vụ để lấy mã PIN mới.' }
  if (data.loi === 'sai') {
    return { ok: false, loi: data.con_lai > 0
      ? `Số điện thoại hoặc mã PIN chưa đúng. Còn ${data.con_lai} lần thử trước khi tạm khóa.`
      : 'Số điện thoại hoặc mã PIN chưa đúng. Đăng nhập tạm khóa 15 phút.' }
  }
  luuToken(data.token)
  return { ok: true, lop: data.lop ?? [] }
}

/** Các lớp của phiên đang lưu trên máy. null = chưa đăng nhập hoặc phiên đã hết. */
export async function cacLopCuaToi(): Promise<LopCuaToi[] | null> {
  const t = tokenLopTruong()
  if (!t) return null
  const { data, error } = await supabase.rpc('lt_cac_lop', { p_token: t })
  if (error) throw new Error('Không kết nối được, bạn thử lại nhé.')
  if (data?.loi) { luuToken(null); return null }
  return data.lop ?? []
}

export async function dangXuat() {
  const t = tokenLopTruong()
  luuToken(null)
  if (t) await supabase.rpc('dang_xuat_lop_truong', { p_token: t })
}

/* ---------------- Dữ liệu một lớp ---------------- */
export interface AnhLT {
  id: string
  loai: 'xua' | 'chuong'
  chuong_id: string | null
  muc: string | null
  chu_thich: string | null
  nguoi_gui_ten: string | null
  trang_thai: 'cho-duyet' | 'da-duyet' | 'an'
  xem: string
  tao_luc: string
}
export interface ChuongLT {
  id: string
  ma_qr: string
  tieu_de: string
  ngay: string | null
  dia_diem: string | null
  mo_ta: string | null
  video_url: string | null
  anh_tap_the_id: string | null
  so_anh: number
}
export interface DuLieuLT {
  lop: { id: string; ma: string; ten_lop: string; truong: string; giao_dien: MaGiaoDien; trang_thai: string;
         nien_khoa_bat_dau: number | null; nien_khoa_ket_thuc: number | null }
  ho_ten: string
  chuong: ChuongLT[]
  anh: AnhLT[]
}

/** Phiên hết hạn hoặc bị đăng xuất (vd chủ dịch vụ tạo PIN mới) */
export class HetPhien extends Error { constructor() { super('het-phien') } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function goi<T = any>(ham: string, thamSo: Record<string, unknown>): Promise<T> {
  const t = tokenLopTruong()
  if (!t) throw new HetPhien()
  const { data, error } = await supabase.rpc(ham, { p_token: t, ...thamSo })
  if (error) throw new Error(error.code === 'PGRST202'
    ? 'Cơ sở dữ liệu chưa được cập nhật: cần chạy file SQL 0006.'
    : 'Không kết nối được, bạn thử lại nhé.')
  if (data?.loi === 'het-phien') { luuToken(null); throw new HetPhien() }
  if (data?.loi) {
    const tb: Record<string, string> = {
      'co-anh': 'Buổi này đã có ảnh nên không xóa được. Cần xóa thì nhắn chủ dịch vụ nhé.',
      'tieu-de': 'Bạn đặt tên cho buổi họp nhé.',
      video: 'Link video phải bắt đầu bằng https://',
      'buoi-sai': 'Không tìm thấy buổi họp này.',
    }
    throw new Error(tb[data.loi] ?? 'Có lỗi, bạn thử lại nhé.')
  }
  return data as T
}

export const duLieuLop = (lopId: string) => goi<DuLieuLT>('lt_du_lieu', { p_lop: lopId })

export const doiTrangThaiAnh = (lopId: string, ids: string[], trangThai: AnhLT['trang_thai']) =>
  goi('lt_doi_trang_thai_anh', { p_lop: lopId, p_ids: ids, p_trang_thai: trangThai })

/** Xếp ảnh vào một buổi họp, hoặc một mục ảnh xưa (muc null = chưa rõ) */
export const xepAnh = (lopId: string, ids: string[], dich: { chuongId: string } | { muc: string | null }) =>
  goi('lt_xep_anh', {
    p_lop: lopId, p_ids: ids,
    p_chuong_id: 'chuongId' in dich ? dich.chuongId : null,
    p_muc: 'muc' in dich ? dich.muc : null,
  })

export interface BuoiHopSua {
  tieu_de: string; ngay: string | null; dia_diem: string | null; mo_ta: string | null; video_url: string | null
}
export const luuBuoiHop = (lopId: string, id: string | null, c: BuoiHopSua) =>
  goi<{ id: string }>('lt_luu_chuong', {
    p_lop: lopId, p_id: id, p_tieu_de: c.tieu_de, p_ngay: c.ngay || null,
    p_dia_diem: c.dia_diem, p_mo_ta: c.mo_ta, p_video_url: c.video_url,
  })

export const xoaBuoiHop = (lopId: string, id: string) => goi('lt_xoa_chuong', { p_lop: lopId, p_id: id })

export const datAnhTapThe = (lopId: string, chuongId: string, anhId: string) =>
  goi('lt_dat_anh_tap_the', { p_lop: lopId, p_chuong_id: chuongId, p_anh_id: anhId })
