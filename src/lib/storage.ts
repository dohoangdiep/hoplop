/**
 * Mọi thao tác lưu trữ ảnh đi qua module này, để sau chuyển từ Supabase Storage
 * sang Cloudflare R2 / S3 (Viettel, PA) mà không phải sửa chỗ khác.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

const BUCKET = 'anh'

export async function taiLen(duongDan: string, file: Blob, kieu: string) {
  const { error } = await supabase.storage.from(BUCKET).upload(duongDan, file, { contentType: kieu, upsert: false })
  // Lần thử trước đã tải xong nhưng mất phản hồi: file đã có, coi như thành công
  if (error && !/exists|duplicate/i.test(error.message)) throw error
}

/**
 * Lớp trưởng xem được cả ảnh đã ẩn: gửi kèm token qua header x-hoplop-lt,
 * hàm cho_phep_xem_anh phía máy chủ kiểm token đó.
 */
let khachLt: { token: string; khach: SupabaseClient } | null = null
function khachTheoToken(token?: string | null): SupabaseClient {
  if (!token) return supabase
  if (khachLt?.token !== token) {
    khachLt = {
      token,
      khach: createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
        global: { headers: { 'x-hoplop-lt': token } },
        auth: { persistSession: false, autoRefreshToken: false, storageKey: 'hoplop-lt-anh' },
      }),
    }
  }
  return khachLt.khach
}

/** Ký link xem có hạn cho nhiều ảnh cùng lúc. Trả về map đường dẫn -> url. */
export async function linkXemNhieu(duongDan: (string | null | undefined)[], giay = 3600, tokenLopTruong?: string | null): Promise<Record<string, string>> {
  const ds = [...new Set(duongDan.filter((d): d is string => !!d))]
  if (!ds.length) return {}
  const { data, error } = await khachTheoToken(tokenLopTruong).storage.from(BUCKET).createSignedUrls(ds, giay)
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

/** Xóa hẳn nhiều file trên kho (chỉ quản trị có quyền). */
export async function xoaNhieu(duongDan: (string | null | undefined)[]) {
  const ds = [...new Set(duongDan.filter((d): d is string => !!d))]
  for (let i = 0; i < ds.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET).remove(ds.slice(i, i + 100))
    if (error) throw error
  }
}
