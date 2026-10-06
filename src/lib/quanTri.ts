import { linkXemNhieu, xoaNhieu } from './storage'
import { guiAnh } from './guiAnh'
import { supabase } from './supabase'
import { taoMaLop } from './maLop'
import type { MaGiaoDien } from '../themes'
import type { CapHoc } from './guiAnh'

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
  luon_can_mat_khau: boolean
  /** Cấp học (thiếu = THPT, vd danh sách lớp không trả cột này) */
  cap?: CapHoc
}

export interface LopTruongQT { id: string; ho_ten: string; sdt: string }
export interface LopDanhSach extends LopQuanTri {
  lop_truong: LopTruongQT[]
  so_cho_duyet: number
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

/** Danh sách lớp kèm lớp trưởng (tên + SĐT) và số ảnh chờ duyệt */
export async function danhSachLop(): Promise<LopDanhSach[]> {
  const { data, error } = await supabase.rpc('qt_ds_lop')
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Cơ sở dữ liệu chưa được cập nhật: hãy chạy file SQL 0006 trong Supabase → SQL Editor.')
    throw error
  }
  return (data ?? []) as LopDanhSach[]
}

/** Bỏ dấu tiếng Việt, chữ thường: để tìm "thanh mien" ra "Thanh Miện" */
export const boDau = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

/**
 * Tìm lớp theo SĐT lớp trưởng (gõ +84, 0, dấu cách, dấu chấm đều được; vài số cuối cũng ra),
 * mã lớp, tên gọi, tên lớp, trường, tỉnh.
 */
export function locLop(ds: LopDanhSach[], tuKhoa: string): LopDanhSach[] {
  const q = boDau(tuKhoa.trim())
  if (!q) return ds
  const so = q.replace(/[\s.+()-]/g, '')
  const laSo = /^\d{3,}$/.test(so)
  // "+84 912…" -> "0912…"; vẫn thử cả dạng gốc vì vài số cuối có thể bắt đầu bằng 84
  const cachViet = laSo ? [so, ...(so.startsWith('84') ? ['0' + so.slice(2)] : [])] : []
  return ds.filter((l) => {
    if (laSo && l.lop_truong.some((t) => cachViet.some((c) => t.sdt.includes(c)))) return true
    const chu = boDau([l.ma, l.ten_goi ?? '', `lop ${l.ten_lop}`, l.ten_lop, l.truong, l.tinh ?? '', ...l.lop_truong.map((t) => t.ho_ten)].join(' | '))
    return q.split(/\s+/).every((tu) => chu.includes(tu))
  })
}

export async function layLop(id: string): Promise<LopQuanTri | null> {
  const { data, error } = await supabase
    .from('lop')
    .select('id, ma, ten_goi, ten_lop, truong, tinh, nien_khoa_bat_dau, nien_khoa_ket_thuc, giao_dien, trang_thai, het_han, tao_luc, luon_can_mat_khau, cap')
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
  cap: CapHoc
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
        cap: tt.cap,
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

export async function capNhatLop(id: string, thayDoi: Partial<Pick<LopQuanTri, 'giao_dien' | 'trang_thai' | 'ten_goi' | 'het_han' | 'luon_can_mat_khau' | 'cap'>>) {
  const { error } = await supabase.from('lop').update(thayDoi).eq('id', id)
  if (error) throw error
}

/* ---------------- Lớp trưởng ---------------- */
export interface KetQuaThemLT { id: string; sdt: string; pin: string | null; dung_chung: boolean; lop_khac: string | null }

const LOI_LT: Record<string, string> = {
  'ho-ten': 'Nhập họ tên lớp trưởng.',
  sdt: 'Số điện thoại chưa đúng (cần 10 số, vd 0912 345 678).',
  trung: 'Số điện thoại này đã là lớp trưởng của lớp này rồi.',
  'du-2': 'Mỗi lớp tối đa 2 lớp trưởng. Xóa bớt một người trước nhé.',
  'khong-tim-thay': 'Không tìm thấy lớp trưởng này.',
}

export async function themLopTruong(lopId: string, hoTen: string, sdt: string): Promise<KetQuaThemLT> {
  const { data, error } = await supabase.rpc('qt_them_lop_truong', { p_lop: lopId, p_ho_ten: hoTen, p_sdt: sdt })
  if (error) throw error
  if (data?.loi) throw new Error(LOI_LT[data.loi] ?? 'Có lỗi, thử lại nhé.')
  return data as KetQuaThemLT
}

/** PIN mới áp dụng cho mọi lớp cùng SĐT; mọi máy đang đăng nhập bị đăng xuất. */
export async function taoPinMoi(lopTruongId: string): Promise<{ pin: string; sdt: string; so_lop: number }> {
  const { data, error } = await supabase.rpc('qt_tao_pin_moi', { p_id: lopTruongId })
  if (error) throw error
  if (data?.loi) throw new Error(LOI_LT[data.loi] ?? 'Có lỗi, thử lại nhé.')
  return data
}

export async function xoaLopTruong(lopTruongId: string) {
  const { error } = await supabase.rpc('qt_xoa_lop_truong', { p_id: lopTruongId })
  if (error) throw error
}

export const linkZalo = (sdt: string) => `https://zalo.me/${sdt}`

/** Tin nhắn Zalo gửi riêng cho lớp trưởng: link lớp, cách đăng nhập, mã PIN. */
export function tinNhanLopTruong(o: { hoTen: string; sdt: string; pin: string | null; tenLop: string; truong: string; ma: string }) {
  const goc = window.location.origin
  const ten = o.hoTen.trim().split(/\s+/).pop()
  return [
    `Chào ${ten}, trang kỷ niệm lớp ${o.tenLop} · ${o.truong} đã sẵn sàng.`,
    `Link cho cả lớp (gửi vào nhóm Zalo được, không cần mật khẩu): ${goc}/${o.ma}`,
    '',
    `Riêng bạn là lớp trưởng: vào ${goc}/lop-truong để duyệt ảnh các bạn gửi, tạo buổi họp và in mã QR.`,
    `Số điện thoại: ${o.sdt}`,
    o.pin ? `Mã PIN: ${o.pin}` : 'Mã PIN: dùng mã PIN bạn đang có (giống lớp kia).',
    'Mã PIN là của riêng bạn, đừng gửi vào nhóm nhé. Đăng nhập một lần, máy sẽ nhớ.',
  ].join('\n')
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
  chuong_id: string | null
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
    .select('id, loai, chuong_id, muc, chu_thich, nguoi_gui_ten, trang_thai, duong_dan_xem, duong_dan_goc, tao_luc')
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

/** Xếp ảnh vào một buổi họp, một mục ảnh xưa, hoặc "chưa rõ" (muc null) */
export async function xepAnhQT(ids: string[], noi: { chuongId: string } | { muc: string | null }) {
  if (!ids.length) return
  const thayDoi = 'chuongId' in noi
    ? { loai: 'chuong', chuong_id: noi.chuongId, muc: null }
    : { loai: 'xua', chuong_id: null, muc: noi.muc }
  const { error } = await supabase.from('anh').update(thayDoi).in('id', ids)
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

/* ---------------- Các lần họp (chương) ---------------- */
export interface ChuongQT {
  id: string
  ma_qr: string
  tieu_de: string
  ngay: string | null
  dia_diem: string | null
  mo_ta: string | null
  video_url: string | null
  anh_tap_the_id: string | null
  qr_hieu_luc_tu: string | null
  qr_hieu_luc_den: string | null
  thu_tu: number
}
export type ChuongSua = Partial<Omit<ChuongQT, 'id' | 'ma_qr'>>

export async function dsChuong(lopId: string): Promise<ChuongQT[]> {
  const { data, error } = await supabase.from('chuong')
    .select('id, ma_qr, tieu_de, ngay, dia_diem, mo_ta, video_url, anh_tap_the_id, qr_hieu_luc_tu, qr_hieu_luc_den, thu_tu')
    .eq('lop_id', lopId).order('ngay', { ascending: false, nullsFirst: true })
  if (error) throw error
  return (data ?? []) as ChuongQT[]
}

export async function taoChuong(lopId: string, c: ChuongSua & { tieu_de: string }) {
  const { error } = await supabase.from('chuong').insert({ lop_id: lopId, ...c })
  if (error) throw error
}

export async function suaChuong(id: string, c: ChuongSua) {
  const { error } = await supabase.from('chuong').update(c).eq('id', id)
  if (error) throw error
}

/** Xóa một lần họp. Ảnh của buổi đó vẫn giữ lại (chuyển sang "không thuộc buổi nào"). */
export async function xoaChuong(id: string) {
  const { error } = await supabase.from('chuong').delete().eq('id', id)
  if (error) throw error
}

export async function datAnhTapThe(chuongId: string, anhId: string) {
  await capNhatAnh(anhId, { trang_thai: 'da-duyet' })
  await suaChuong(chuongId, { anh_tap_the_id: anhId })
}

/* ---------------- Tên gọi ---------------- */
/** Đặt tên gọi (rỗng = bỏ). Tên cũ được giữ để link cũ vẫn chuyển hướng. */
export async function datTenGoi(lopId: string, tenGoi: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('qt_dat_ten_goi', { p_lop: lopId, p_ten_goi: tenGoi })
  if (error) throw new Error(error.code === 'PGRST202' ? 'Cần chạy file SQL 0007 trước.' : error.message)
  const loi: Record<string, string> = {
    dang: 'Tên gọi chỉ gồm chữ thường không dấu, số và dấu gạch ngang, dài 3–40 ký tự, không bắt đầu hay kết thúc bằng dấu gạch.',
    'giong-ma': 'Tên gọi không được là 6 ký tự giống mã lớp. Thêm dấu gạch hoặc số, vd "12a1-2006".',
    trung: 'Tên gọi này đã có lớp khác dùng (hoặc là từ dành riêng của hệ thống).',
  }
  if (data?.loi) throw new Error(loi[data.loi] ?? 'Có lỗi, thử lại nhé.')
  return data.ten_goi ?? null
}

/* ---------------- Hộp thư thời gian ---------------- */
export interface ThuQT {
  id: string
  nguoi_viet: string | null
  noi_dung: string
  mo_vao_ngay: string | null
  mo_vao_chuong_id: string | null
  an: boolean
  tao_luc: string
}

export async function dsThuQT(lopId: string): Promise<ThuQT[]> {
  const { data, error } = await supabase.from('thu_hen_gio')
    .select('id, nguoi_viet, noi_dung, mo_vao_ngay, mo_vao_chuong_id, an, tao_luc')
    .eq('lop_id', lopId).order('tao_luc', { ascending: false })
  if (error) throw error
  return (data ?? []) as ThuQT[]
}

export async function anThu(id: string, an: boolean) {
  const { error } = await supabase.from('thu_hen_gio').update({ an }).eq('id', id)
  if (error) throw error
}

export async function xoaThu(id: string) {
  const { error } = await supabase.from('thu_hen_gio').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- Ảnh riêng cho Tái hiện / thầy cô ---------------- */
/**
 * Tải một ảnh lên làm ảnh riêng (không hiện trong kho ảnh xưa): dùng mục 'chan-dung' như ảnh
 * ngày ấy – bây giờ của từng bạn. Ảnh quản trị tải lên được duyệt sẵn. Trả về id ảnh.
 */
export async function taiAnhRieng(lopMa: string, file: File, chuThich: string): Promise<string> {
  const r = await guiAnh([file], { khoa: lopMa, muc: 'chan-dung', nguoiGui: 'Ban liên lạc', chuThich }, () => {})
  if (r.loi) throw new Error(r.loi)
  if (!r.ids[0]) throw new Error('Tải ảnh không thành công, bạn thử lại nhé.')
  return r.ids[0]
}

/** Map anh_id -> link xem, cho một danh sách id ảnh */
export async function linkTheoId(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const ds = [...new Set(ids.filter((x): x is string => !!x))]
  if (!ds.length) return {}
  const { data } = await supabase.from('anh').select('id, duong_dan_xem').in('id', ds)
  const link = await linkXemNhieu((data ?? []).map((a) => a.duong_dan_xem))
  return Object.fromEntries((data ?? []).map((a) => [a.id, link[a.duong_dan_xem]]).filter(([, u]) => u))
}

/* ---------------- Tái hiện ---------------- */
export interface TaiHienQT {
  id: string
  anh_xua_id: string | null
  anh_nay_id: string | null
  chu_thich: string | null
  nam_xua: number | null
  nam_nay: number | null
  thu_tu: number
}

export async function dsTaiHienQT(lopId: string): Promise<TaiHienQT[]> {
  const { data, error } = await supabase.from('tai_hien')
    .select('id, anh_xua_id, anh_nay_id, chu_thich, nam_xua, nam_nay, thu_tu')
    .eq('lop_id', lopId).order('thu_tu').order('tao_luc')
  if (error) throw new Error(error.code === '42703' ? 'Cần chạy file SQL 0008 trước.' : error.message)
  return (data ?? []) as TaiHienQT[]
}

export async function luuTaiHien(lopId: string, id: string | null, c: Omit<TaiHienQT, 'id' | 'thu_tu'>) {
  // Ảnh dùng cho Tái hiện phải được duyệt mới hiện trên trang lớp
  const anh = [c.anh_xua_id, c.anh_nay_id].filter((x): x is string => !!x)
  if (anh.length) await capNhatNhieuAnh(anh, { trang_thai: 'da-duyet' })
  const { error } = id
    ? await supabase.from('tai_hien').update(c).eq('id', id)
    : await supabase.from('tai_hien').insert({ ...c, lop_id: lopId })
  if (error) throw error
}

export async function xoaTaiHien(id: string) {
  const { error } = await supabase.from('tai_hien').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- Góc thầy cô ---------------- */
export interface ThayCoQT {
  id: string
  ho_ten: string
  vai_tro: string | null
  mon: string | null
  cau_noi: string | null
  anh_id: string | null
  thu_tu: number
}

export async function dsThayCoQT(lopId: string): Promise<ThayCoQT[]> {
  const { data, error } = await supabase.from('thay_co')
    .select('id, ho_ten, vai_tro, mon, cau_noi, anh_id, thu_tu').eq('lop_id', lopId).order('thu_tu').order('ho_ten')
  if (error) throw new Error(error.code === '42703' ? 'Cần chạy file SQL 0008 trước.' : error.message)
  return (data ?? []) as ThayCoQT[]
}

export async function luuThayCo(lopId: string, id: string | null, c: Omit<ThayCoQT, 'id'>) {
  if (c.anh_id) await capNhatAnh(c.anh_id, { trang_thai: 'da-duyet' })
  const { error } = id
    ? await supabase.from('thay_co').update(c).eq('id', id)
    : await supabase.from('thay_co').insert({ ...c, lop_id: lopId })
  if (error) throw error
}

export async function xoaThayCo(id: string) {
  const { error } = await supabase.from('thay_co').delete().eq('id', id)
  if (error) throw error
}

/**
 * Dọn file của các ảnh lớp trưởng đã xóa hẳn (lớp trưởng không có quyền xóa file trên kho).
 * Gọi lặng lẽ mỗi lần mở danh sách lớp; lỗi thì bỏ qua, lần sau dọn tiếp.
 */
export async function donFileChoXoa(): Promise<number> {
  const { data, error } = await supabase.from('file_cho_xoa').select('duong_dan').limit(500)
  if (error || !data?.length) return 0
  const ds = data.map((d) => d.duong_dan as string)
  await xoaNhieu(ds)
  await supabase.from('file_cho_xoa').delete().in('duong_dan', ds)
  return ds.length
}
