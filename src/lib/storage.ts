/**
 * Mọi thao tác lưu trữ ảnh đi qua module này, để sau chuyển từ Supabase Storage
 * sang Cloudflare R2 / S3 (Viettel, PA) mà không phải sửa chỗ khác.
 */
import { supabase } from './supabase'

const BUCKET = 'anh'

export async function taiLen(duongDan: string, file: Blob, kieu: string) {
  const { error } = await supabase.storage.from(BUCKET).upload(duongDan, file, { contentType: kieu, upsert: false })
  // Lần thử trước đã tải xong nhưng mất phản hồi: file đã có, coi như thành công
  if (error && !/exists|duplicate/i.test(error.message)) throw error
}

/** Ký link xem có hạn cho nhiều ảnh cùng lúc. Trả về map đường dẫn -> url. */
export async function linkXemNhieu(duongDan: string[], giay = 3600): Promise<Record<string, string>> {
  const ds = [...new Set(duongDan.filter(Boolean))]
  if (!ds.length) return {}
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(ds, giay)
  if (error || !data) return {}
  const kq: Record<string, string> = {}
  for (const d of data) if (d.path && d.signedUrl) kq[d.path] = d.signedUrl
  return kq
}

/** Link tải bản gốc (chỉ quản trị có quyền đọc bản gốc). */
export async function linkTaiGoc(duongDan: string, tenFile: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(duongDan, 600, { download: tenFile })
  return data?.signedUrl ?? null
}
