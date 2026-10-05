/**
 * Vẽ ảnh minh họa cho trang chủ bằng chính bộ vẽ demo (src/lib/veAnhDemo.ts).
 * Chạy: python3 scripts/anh-trang-chu/chay.py  → ghi vào public/trang-chu/
 */
import { veCanh, veChanDung } from '../../src/lib/veAnhDemo'

async function thu(file: File, rong: number): Promise<string> {
  const bmp = await createImageBitmap(file)
  const cao = Math.round((bmp.height / bmp.width) * rong)
  const cv = document.createElement('canvas'); cv.width = rong; cv.height = cao
  cv.getContext('2d')!.drawImage(bmp, 0, 0, rong, cao)
  return cv.toDataURL('image/jpeg', 0.82)
}

export const BAN = [
  { ten: 'hung', nu: false, seed: 5013 },
  { ten: 'lan', nu: true, seed: 5026 },
  { ten: 'tuan', nu: false, seed: 5039 },
  { ten: 'mai', nu: true, seed: 5052 },
  { ten: 'dung', nu: false, seed: 5065 },
  { ten: 'ha', nu: true, seed: 5078 },
]

;(window as any).veTatCa = async () => {
  const ra: Record<string, string> = {}
  for (const b of BAN) {
    ra[`${b.ten}-xua.jpg`] = await thu(await veChanDung(b.seed, b.nu, 'xua', 2006), 360)
    ra[`${b.ten}-nay.jpg`] = await thu(await veChanDung(b.seed, b.nu, 'nay', 2006), 360)
  }
  ra['kho-anh-xua.jpg'] = await thu(await veCanh('lop-hoc', 3101, '12A1', 2005), 720)
  ra['cam-trai.jpg'] = await thu(await veCanh('cam-trai', 3202, '12A1', 2005), 720)
  ra['be-giang.jpg'] = await thu(await veCanh('tap-the', 3303, '12A1', 2006, 'BẾ GIẢNG 12A1 · 2006'), 720)
  ra['hop-lop.jpg'] = await thu(await veCanh('hop-lop', 3404, '12A1', 2026, 'HỌP LỚP 12A1 · 20 NĂM'), 720)
  return ra
}
