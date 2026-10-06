/**
 * Tờ QR A5 để in đặt trên bàn tiệc: quét là mở trang gửi ảnh với buổi họp đã chọn sẵn.
 * Dùng chung cho trang quản trị và trang lớp trưởng. Tờ in luôn nền trắng chữ tối để in đẹp,
 * không theo giao diện lớp.
 */
import QRCode from 'qrcode'

export const linkQrChuong = (maLop: string, maQr: string) => `${window.location.origin}/${maLop}/q/${maQr}`

/** Vẽ tờ QR để in đặt trên bàn tiệc: tên buổi họp, mã QR to, lời dặn ngắn. */
export async function veToQr(url: string, tenLop: string, truong: string, tieuDe: string, phu: string): Promise<string> {
  const W = 1240, H = 1754 // A5 dọc ~150dpi
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  try { await document.fonts.load('700 60px "Be Vietnam Pro"') } catch { /* dùng phông mặc định */ }
  const font = (w: number, px: number) => `${w} ${px}px "Be Vietnam Pro", system-ui, sans-serif`
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H)
  g.textAlign = 'center'; g.fillStyle = '#22203A'
  const dong = (chu: string, y: number, f: string, rongMax = W - 160) => {
    g.font = f
    const tu = chu.split(' '); let hang = ''; const ds: string[] = []
    for (const t of tu) { const thu = hang ? hang + ' ' + t : t; if (g.measureText(thu).width > rongMax && hang) { ds.push(hang); hang = t } else hang = thu }
    if (hang) ds.push(hang)
    const cao = parseInt(f.split(' ')[1]) * 1.25
    ds.forEach((d, i) => g.fillText(d, W / 2, y + i * cao))
    return y + ds.length * cao
  }
  let y = 150
  y = dong(`Lớp ${tenLop} · ${truong}`, y, font(500, 40))
  y = dong(tieuDe, y + 40, font(700, 72))
  if (phu) y = dong(phu, y + 10, font(400, 38))
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, url, { width: 820, margin: 1 })
  const yQr = Math.max(y + 40, 520)
  g.drawImage(qr, (W - 820) / 2, yQr)
  y = yQr + 820 + 90
  y = dong('Quét mã để gửi ảnh vào album chung của lớp', y, font(700, 46))
  dong('Không cần cài app, không cần đăng nhập', y + 6, font(400, 36))
  g.fillStyle = '#6B6680'
  dong(url.replace(/^https?:\/\//, ''), H - 70, font(400, 28))
  return c.toDataURL('image/png')
}

