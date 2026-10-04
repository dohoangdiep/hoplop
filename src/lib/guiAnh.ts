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
  maQr?: string
  muc?: string
  chuThich?: string
  nguoiGui?: string
}

/**
 * Gửi nhiều ảnh: xin lượt gửi (kiểm tra mật khẩu/QR), rồi nén và tải TỪNG ảnh
 * (bản xem ~1600px + bản gốc), thử lại khi mạng chập chờn.
 */
export async function guiAnh(
  files: File[],
  tt: ThongTinGui,
  baoTienDo: (i: number, trangThai: TrangThaiAnh) => void,
): Promise<{ thanhCong: number; loi?: string; ids: string[] }> {
  const { data, error } = await supabase.rpc('tao_luot_gui', {
    p_khoa: tt.khoa,
    p_so_anh: files.length,
    p_mat_khau: tt.matKhau ?? null,
    p_ma_qr: tt.maQr ?? null,
    p_muc: tt.muc ?? null,
    p_chu_thich: tt.chuThich ?? null,
    p_nguoi_gui: tt.nguoiGui ?? null,
    p_kieu_goc: files.map(duoiFile),
  })
  if (error) return { thanhCong: 0, loi: 'Không kết nối được, bạn thử lại nhé.', ids: [] }
  if (data?.loi) {
    const thongBao: Record<string, string> = {
      'can-mat-khau': 'Mật khẩu lớp chưa đúng.',
      'qr-sai': 'Mã QR không đúng.',
      'qr-het-han': 'Mã QR của buổi họp này đã hết hạn.',
      'qua-nhieu': 'Lớp đang nhận quá nhiều ảnh, bạn đợi ít phút rồi gửi tiếp nhé.',
      'so-anh': `Mỗi lần gửi tối đa ${TOI_DA_ANH} ảnh.`,
      'khong-tim-thay': 'Không tìm thấy lớp hoặc lớp đang ở chế độ chỉ xem.',
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
  return { thanhCong, ids }
}
