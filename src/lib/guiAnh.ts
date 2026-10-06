import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'
import { taiLen } from './storage'

export const MUC_ANH: { ma: string; ten: string }[] = [
  { ma: 'lop-10', ten: 'Lớp 10' },
  { ma: 'lop-11', ten: 'Lớp 11' },
  { ma: 'lop-12', ten: 'Lớp 12' },
  { ma: 'cam-trai', ten: 'Cắm trại' },
  { ma: 'be-giang', ten: 'Bế giảng' },
  { ma: 'khac', ten: 'Khác' },
]
export const TEN_MUC: Record<string, string> = Object.fromEntries(MUC_ANH.map((m) => [m.ma, m.ten]))

/**
 * "Ảnh này thuộc đâu": một mục ảnh xưa, một buổi họp, hoặc chưa rõ.
 * Mã hóa thành chuỗi để dùng làm value của nút chọn / <select>.
 */
export type NoiAnh = { chuongId: string } | { muc: string | null }
export const maNoiAnh = (n: NoiAnh) => ('chuongId' in n ? `chuong:${n.chuongId}` : n.muc ? `muc:${n.muc}` : 'khong-ro')
export function giaiNoiAnh(s: string): NoiAnh {
  if (s.startsWith('chuong:')) return { chuongId: s.slice(7) }
  if (s.startsWith('muc:')) return { muc: s.slice(4) }
  return { muc: null }
}
export const noiCuaAnh = (a: { loai: string; chuong_id: string | null; muc: string | null }): NoiAnh =>
  a.loai === 'chuong' && a.chuong_id ? { chuongId: a.chuong_id } : { muc: a.muc }

export const TOI_DA_ANH = 20
export const TOI_DA_MB = 25

export type TrangThaiAnh = 'cho' | 'dang-nen' | 'dang-tai' | 'xong' | 'loi'

function duoiFile(f: File): string {
  const t = f.type.toLowerCase()
  if (t.includes('png')) return 'png'
  if (t.includes('webp')) return 'webp'
  if (t.includes('heic') || t.includes('heif')) return 'heic'
  return 'jpg'
}

async function kichThuoc(b: Blob): Promise<{ rong: number; cao: number }> {
  try {
    const bmp = await createImageBitmap(b)
    const r = { rong: bmp.width, cao: bmp.height }
    bmp.close()
    return r
  } catch { return { rong: 0, cao: 0 } }
}

async function thuLai<T>(viec: () => Promise<T>, lan = 3): Promise<T> {
  let loi: unknown
  for (let i = 0; i < lan; i++) {
    try { return await viec() } catch (e) {
      loi = e
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
  throw loi
}

export interface ThongTinGui {
  khoa: string
  matKhau?: string | null
  /** Mã QR buổi họp: đủ để gửi ảnh kể cả khi lớp cần mật khẩu */
  maQr?: string | null
  /** Gửi vào một buổi họp. Không có thì vào kho ảnh xưa theo `muc` */
  chuongId?: string | null
  /** Mục ảnh xưa; null = "không nhớ rõ" (lớp trưởng xếp sau) */
  muc?: string | null
  chuThich?: string
  nguoiGui?: string
  /** Token lớp trưởng: ảnh được duyệt sẵn */
  tokenLopTruong?: string | null
}

export interface KetQuaGui {
  thanhCong: number
  loi?: string
  ids: string[]
  /** true: ảnh hiện ngay (lớp trưởng, quản trị); false: chờ duyệt */
  daDuyet?: boolean
}

/**
 * Gửi nhiều ảnh: xin lượt gửi (kiểm tra quyền), rồi nén và tải TỪNG ảnh
 * (bản xem ~1600px + bản gốc), thử lại khi mạng chập chờn.
 */
export async function guiAnh(
  files: File[],
  tt: ThongTinGui,
  baoTienDo: (i: number, trangThai: TrangThaiAnh) => void,
): Promise<KetQuaGui> {
  const thamSo = {
    p_khoa: tt.khoa,
    p_so_anh: files.length,
    p_mat_khau: tt.matKhau ?? null,
    p_ma_qr: tt.maQr ?? null,
    p_chuong_id: tt.chuongId ?? null,
    p_muc: tt.chuongId ? null : tt.muc === undefined ? 'khac' : tt.muc,
    p_chu_thich: tt.chuThich ?? null,
    p_nguoi_gui: tt.nguoiGui ?? null,
    p_kieu_goc: files.map(duoiFile),
    p_token: tt.tokenLopTruong ?? null,
  }
  let { data, error } = await supabase.rpc('tao_luot_gui', thamSo)
  // Mạng chập chờn: thử lại tối đa 2 lần nữa
  for (let lan = 0; error && !error.code && lan < 2; lan++) {
    await new Promise((r) => setTimeout(r, 1500 * (lan + 1)))
    ;({ data, error } = await supabase.rpc('tao_luot_gui', thamSo))
  }
  if (error) {
    const loi = error.code === '23514'
      ? 'Cơ sở dữ liệu chưa được cập nhật: hãy chạy file SQL mới nhất trong thư mục supabase/migrations.'
      : error.code === 'PGRST202'
        ? 'Thiếu hàm trên cơ sở dữ liệu: hãy chạy file SQL 0006.'
        : `Không kết nối được, bạn thử lại nhé. (${error.code ?? ''} ${error.message})`
    return { thanhCong: 0, loi, ids: [] }
  }
  if (data?.loi) {
    const thongBao: Record<string, string> = {
      'can-mat-khau': 'Mật khẩu lớp chưa đúng.',
      'tam-khoa': 'Có nhiều lần nhập sai mật khẩu, bạn đợi khoảng 10 phút rồi thử lại nhé.',
      'buoi-sai': 'Không tìm thấy buổi họp này, bạn tải lại trang rồi chọn lại nhé.',
      'chi-xem': 'Trang lớp đang ở chế độ chỉ xem nên tạm ngừng nhận ảnh.',
      'qua-nhieu': 'Lớp đang nhận quá nhiều ảnh, bạn đợi ít phút rồi gửi tiếp nhé.',
      'so-anh': `Mỗi lần gửi tối đa ${TOI_DA_ANH} ảnh.`,
      'khong-tim-thay': 'Không tìm thấy lớp.',
    }
    return { thanhCong: 0, loi: thongBao[data.loi] ?? 'Có lỗi, bạn thử lại nhé.', ids: [] }
  }

  const luot: { id: string; xem: string; goc: string }[] = data.anh
  let thanhCong = 0
  const ids: string[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    try {
      baoTienDo(i, 'dang-nen')
      const banXem = await imageCompression(f, {
        maxWidthOrHeight: 1600, maxSizeMB: 0.5, fileType: 'image/jpeg', initialQuality: 0.82, useWebWorker: true,
      })
      const { rong, cao } = await kichThuoc(banXem)
      baoTienDo(i, 'dang-tai')
      await thuLai(() => taiLen(luot[i].xem, banXem, 'image/jpeg'))
      await thuLai(() => taiLen(luot[i].goc, f, f.type || 'image/jpeg'))
      await supabase.rpc('xong_tai_anh', { p_anh_id: luot[i].id, p_rong: rong, p_cao: cao, p_dung_luong: f.size })
      baoTienDo(i, 'xong')
      thanhCong++
      ids.push(luot[i].id)
    } catch {
      baoTienDo(i, 'loi')
    }
  }
  return { thanhCong, ids, daDuyet: !!data.da_duyet }
}

/* ---------------- Ảnh bạn đã gửi ----------------
 * Máy lưu id các ảnh đã gửi cho từng lớp, để người gửi thấy ảnh nào đang chờ duyệt mà không gửi lại.
 */
const khoaDaGui = (ma: string) => `hoplop:da-gui:${ma.toLowerCase()}`

export function idAnhDaGui(ma: string): string[] {
  try { return JSON.parse(localStorage.getItem(khoaDaGui(ma)) ?? '[]') } catch { return [] }
}
export function ghiAnhDaGui(ma: string, ids: string[]) {
  if (!ids.length) return
  try { localStorage.setItem(khoaDaGui(ma), JSON.stringify([...ids, ...idAnhDaGui(ma)].slice(0, 100))) } catch { /* bỏ qua */ }
}

export interface AnhDaGui { id: string; trangThai: 'cho-duyet' | 'da-duyet' | 'an'; xem: string | null }

export async function tinhTrangAnhDaGui(ma: string): Promise<AnhDaGui[]> {
  const ids = idAnhDaGui(ma)
  if (!ids.length) return []
  const { data, error } = await supabase.rpc('tinh_trang_anh', { p_ids: ids })
  if (error || !Array.isArray(data)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((a: any) => ({ id: a.id, trangThai: a.trang_thai, xem: a.xem ?? null }))
}
