/** Bảng ký tự mã lớp: đã bỏ 0, o, 1, l, i để không bị gõ nhầm. */
export const BANG_KY_TU_MA = 'abcdefghjkmnpqrstuvwxyz23456789'
export const DO_DAI_MA = 6

export function taoMaLop(): string {
  const bytes = new Uint8Array(DO_DAI_MA)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => BANG_KY_TU_MA[b % BANG_KY_TU_MA.length]).join('')
}

export function laMaLopHopLe(s: string): boolean {
  return s.length === DO_DAI_MA && [...s].every((c) => BANG_KY_TU_MA.includes(c))
}

/** Tên gọi tùy chọn: chữ thường không dấu, số, dấu gạch; 3–40 ký tự. */
export function laTenGoiHopLe(s: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(s)
}
