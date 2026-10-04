import { supabase } from './supabase'
import type { Lop } from './types'
import type { MaGiaoDien } from '../themes'
import { LOP_MAU, MA_LOP_MAU } from '../data/lopMau'
import { linkXemNhieu } from './storage'
import { MUC_ANH } from './guiAnh'

export type KetQuaMoLop =
  | { trangThai: 'ok'; lop: Lop }
  | { trangThai: 'can-mat-khau'; xemTruoc: Lop; daNhapSai: boolean }
  | { trangThai: 'tam-khoa' }
  | { trangThai: 'khong-tim-thay' }

const khoaLuu = (k: string) => `hoplop:mk:${k}`
export function matKhauDaLuu(khoa: string): string | null {
  try { return localStorage.getItem(khoaLuu(khoa.toLowerCase())) } catch { return null }
}
function luuMatKhau(khoa: string, mk: string | null) {
  try { mk ? localStorage.setItem(khoaLuu(khoa.toLowerCase()), mk) : localStorage.removeItem(khoaLuu(khoa.toLowerCase())) } catch { /* bỏ qua */ }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chuyenLop(d: any): Lop {
  const l = d.lop ?? {}
  return {
    id: l.id ?? '',
    ma: l.ma ?? '',
    tenGoi: l.ten_goi ?? null,
    tenLop: l.ten_lop ?? '',
    truong: l.truong ?? '',
    tinh: l.tinh ?? undefined,
    nienKhoaBatDau: l.nien_khoa_bat_dau ?? 0,
    nienKhoaKetThuc: l.nien_khoa_ket_thuc ?? 0,
    giaoDien: (l.giao_dien ?? 'hoai-niem') as MaGiaoDien,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thanhVien: (d.thanh_vien ?? []).map((t: any) => ({
      id: t.id,
      hoTen: t.ho_ten,
      tenGoiTat: t.ten_goi_tat || t.ho_ten.split(' ').pop(),
      bietDanh: t.biet_danh ?? undefined,
      noiO: t.noi_o ?? undefined,
      cauLuuBut: t.cau_luu_but ?? undefined,
    })),
    soDo: {
      soDay: d.so_do?.so_day ?? 0,
      soBanMoiDay: d.so_do?.so_ban_moi_day ?? 0,
      choMoiBan: d.so_do?.cho_moi_ban ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      choNgoi: (d.cho_ngoi ?? []).map((c: any) => ({ day: c.day, ban: c.ban, viTri: c.vi_tri, thanhVienId: c.thanh_vien_id })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chuong: (d.chuong ?? []).map((c: any) => ({
      id: c.id, tieuDe: c.tieu_de, ngay: c.ngay ?? '', diaDiem: c.dia_diem ?? undefined,
      sapToi: !!c.ngay && new Date(c.ngay).getTime() > Date.now() - 86400000,
    })),
    khoAnhXua: [],
    soAnhDaLuu: 0,
  }
}

/** Mở trang lớp theo mã/tên gọi. Tự dùng mật khẩu đã lưu trên máy nếu có. */
export async function moLop(khoa: string, matKhau?: string): Promise<KetQuaMoLop> {
  const k = khoa.toLowerCase()
  if (k === MA_LOP_MAU) return { trangThai: 'ok', lop: LOP_MAU }

  const mk = matKhau ?? matKhauDaLuu(k)
  const { data, error } = await supabase.rpc('xem_lop', { p_khoa: k, p_mat_khau: mk })
  if (error || !data) return { trangThai: 'khong-tim-thay' }

  if (data.loi === 'khong-tim-thay') return { trangThai: 'khong-tim-thay' }
  if (data.loi === 'tam-khoa') return { trangThai: 'tam-khoa' }
  if (data.loi === 'can-mat-khau') {
    if (mk) luuMatKhau(k, null)
    return { trangThai: 'can-mat-khau', xemTruoc: chuyenLop(data), daNhapSai: !!matKhau }
  }
  if (mk) luuMatKhau(k, mk)
  return { trangThai: 'ok', lop: await ganAnh(chuyenLop(data), data) }
}

/** Ký link xem cho mọi ảnh của lớp rồi gắn vào thành viên, kho ảnh xưa, ảnh bìa. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ganAnh(lop: Lop, d: any): Promise<Lop> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anh: any[] = d.anh ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tv: any[] = d.thanh_vien ?? []
  const url = await linkXemNhieu([
    ...anh.map((a) => a.xem),
    ...tv.flatMap((t) => [t.anh_xua, t.anh_nay]),
    d.lop?.anh_bia,
  ])
  const xua = anh.filter((a) => a.loai === 'xua')
  return {
    ...lop,
    anhBiaUrl: d.lop?.anh_bia ? url[d.lop.anh_bia] : null,
    soAnhDaLuu: anh.length,
    thanhVien: lop.thanhVien.map((t, i) => ({
      ...t,
      anhXuaUrl: tv[i]?.anh_xua ? url[tv[i].anh_xua] : undefined,
      anhNayUrl: tv[i]?.anh_nay ? url[tv[i].anh_nay] : undefined,
    })),
    khoAnhXua: MUC_ANH
      .map((m) => ({
        ma: m.ma,
        ten: m.ten,
        anh: xua.filter((a) => (a.muc ?? 'khac') === m.ma).map((a) => ({ id: a.id, chuThich: a.chu_thich ?? '', url: url[a.xem] })),
      }))
      .filter((m) => m.anh.length > 0),
    chuong: lop.chuong.map((c) => ({ ...c, soAnh: anh.filter((a) => a.chuong_id === c.id).length || undefined })),
  }
}
