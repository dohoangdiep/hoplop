import type { MaGiaoDien } from '../themes'

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
  anhBiaUrl?: string | null
  thanhVien: ThanhVien[]
  soDo: { soDay: number; soBanMoiDay: number; choMoiBan: number; choNgoi: ChoNgoi[] }
  chuong: Chuong[]
  khoAnhXua: MucAnh[]
  soAnhDaLuu: number
}
