import type { MaGiaoDien } from '../themes'
import type { CapHoc } from './guiAnh'

export interface ThanhVien {
  id: string
  tenGoiTat: string
  hoTen: string
  bietDanh?: string
  noiO?: string
  cauLuuBut?: string
  anhXuaUrl?: string
  anhNayUrl?: string
}

export interface ChoNgoi {
  day: number
  ban: number
  viTri: number
  thanhVienId: string | null
}

export interface Chuong {
  id: string
  tieuDe: string
  ngay: string
  diaDiem?: string
  soNguoi?: number
  soAnh?: number
  sapToi?: boolean
  moTa?: string
  videoUrl?: string
  anhTapTheUrl?: string
  anh?: { id: string; chuThich: string; url?: string }[]
}

export interface MucAnh {
  ma: string
  ten: string
  anh: { id: string; chuThich: string; url?: string }[]
}

export interface Lop {
  id: string
  ma: string
  tenGoi?: string | null
  tenLop: string
  truong: string
  tinh?: string
  nienKhoaBatDau: number
  nienKhoaKetThuc: number
  giaoDien: MaGiaoDien
  /** Cấp học: quyết định các mục ảnh xưa */
  cap?: CapHoc
  anhBiaUrl?: string | null
  thanhVien: ThanhVien[]
  soDo: { soDay: number; soBanMoiDay: number; choMoiBan: number; choNgoi: ChoNgoi[] }
  chuong: Chuong[]
  khoAnhXua: MucAnh[]
  soAnhDaLuu: number
  /** Người đang xem: thành viên, lớp trưởng hay chủ dịch vụ (lớp mẫu: không có) */
  vai?: 'thanh-vien' | 'lop-truong' | 'quan-tri'
  /** Chỉ có khi người xem là lớp trưởng hoặc chủ dịch vụ */
  soChoDuyet?: number
}

/** Một cặp Tái hiện: ảnh xưa và ảnh chụp lại cùng tư thế */
export interface TaiHien {
  id: string
  chuThich: string
  namXua?: number
  namNay?: number
  xuaUrl?: string
  nayUrl?: string
  /** Lớp mẫu: chữ hiện trong khung khi chưa có ảnh */
  nhanXua?: string
  nhanNay?: string
}

/** Một thầy/cô trong Góc thầy cô */
export interface ThayCo {
  id: string
  hoTen: string
  vaiTro?: string
  mon?: string
  cauNoi?: string
  anhUrl?: string
}
