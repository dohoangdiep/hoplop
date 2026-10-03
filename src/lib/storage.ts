/**
 * Mọi thao tác lưu trữ ảnh đi qua module này, để sau chuyển từ Supabase Storage
 * sang Cloudflare R2 / S3 (Viettel, PA) mà không phải sửa chỗ khác.
 */
import { supabase } from './supabase'

const BUCKET = 'anh'

export function duongDanAnh(lopId: string, loai: 'xua' | 'chuong', anhId: string, ban: 'goc' | 'xem') {
  return `lop/${lopId}/${loai}/${anhId}/${ban}.jpg`
}

export async function taiLen(duongDan: string, file: Blob) {
  const { error } = await supabase.storage.from(BUCKET).upload(duongDan, file, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
}

export async function linkXem(duongDan: string, giay = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(duongDan, giay)
  if (error) throw error
  return data.signedUrl
}
