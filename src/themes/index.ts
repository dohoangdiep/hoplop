import themesJson from './themes.json'

export type MaGiaoDien = 'hoai-niem' | 'tuoi-sang' | 'thanh-lich'
export type KieuBia = 'polaroid' | 'khoi-mau' | 'tran-khung'

export interface GiaoDien {
  ten: string
  moTa: string
  kieuBia: KieuBia
  font: {
    body: string
    display: string
    displayWeight: number
    hand: string
    handItalic?: boolean
    googleFonts: string
  }
  mau: Record<string, string>
  bo: Record<string, string>
  bong: Record<string, string>
}

export const GIAO_DIEN = themesJson as Record<MaGiaoDien, GiaoDien>
export const DANH_SACH_GIAO_DIEN = Object.keys(GIAO_DIEN) as MaGiaoDien[]

export function layGiaoDien(ma: string | null | undefined): GiaoDien {
  return GIAO_DIEN[(ma as MaGiaoDien) ?? 'hoai-niem'] ?? GIAO_DIEN['hoai-niem']
}

/** camelCase -> kebab-case: photoOldInk -> photo-old-ink */
function kebab(s: string) {
  return s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
}

/** Bộ CSS variables của một mẫu, để đặt lên phần tử gốc của trang lớp. */
export function bienCss(g: GiaoDien): Record<string, string> {
  const v: Record<string, string> = {
    '--font-body': g.font.body,
    '--font-display': g.font.display,
    '--font-display-weight': String(g.font.displayWeight),
    '--font-hand': g.font.hand,
    '--font-hand-style': g.font.handItalic ? 'italic' : 'normal',
  }
  for (const [k, val] of Object.entries(g.mau)) v[`--mau-${kebab(k)}`] = val
  for (const [k, val] of Object.entries(g.bo)) v[`--bo-${kebab(k)}`] = val
  for (const [k, val] of Object.entries(g.bong)) v[`--bong-${kebab(k)}`] = val
  return v
}

/** Nạp Google Fonts của mẫu (mỗi mẫu một thẻ link, không nạp trùng). */
export function napFont(ma: string, g: GiaoDien) {
  const id = `font-${ma}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?${g.font.googleFonts}&display=swap`
  document.head.appendChild(link)
}
