/**
 * Vẽ ảnh hoạt hình minh họa ngay trên trình duyệt (canvas), dùng để nạp dữ liệu demo.
 * Không cần mạng hay dịch vụ ngoài. Mọi ảnh đều là tranh vẽ, không phải người thật.
 */

type Rng = () => number
export function taoRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const chon = <T,>(r: Rng, ds: T[]) => ds[Math.floor(r() * ds.length)]

const DA = ['#F6D3B3', '#EEC19B', '#E2AE86', '#D49A70', '#F9DEC4']
const TOC = ['#1E1A18', '#2B211C', '#3A2A20', '#151515', '#4A3426']
const AO_LON = ['#3E6FB0', '#C2463B', '#2F8A6B', '#8A5BB5', '#E08A2E', '#455A64', '#B0476F', '#2C7DA0']
const NEN = ['#FDE8C8', '#E3F1FB', '#F4E1F0', '#E5F4E3', '#FFF1D6', '#E8E6FA']

export interface KieuNguoi {
  da: string
  toc: string
  kieuToc: 'ngan' | 'dai' | 'buoc'
  ao: string
  dongPhuc: boolean
  kinh: boolean
  tocBac: boolean
}

export function nguoiNgauNhien(r: Rng, nu: boolean, dongPhuc: boolean, lon = false): KieuNguoi {
  return {
    da: chon(r, DA),
    toc: lon && r() < 0.3 ? '#6E6A66' : chon(r, TOC),
    kieuToc: nu ? (r() < 0.6 ? 'dai' : 'buoc') : 'ngan',
    ao: dongPhuc ? '#FFFFFF' : chon(r, AO_LON),
    dongPhuc,
    kinh: lon ? r() < 0.4 : r() < 0.15,
    tocBac: lon && r() < 0.25,
  }
}

/** Vẽ một người hoạt hình. (x, y) là chân; s là chiều cao. */
function veNguoi(c: CanvasRenderingContext2D, x: number, y: number, s: number, k: KieuNguoi, chiNuaTren = false) {
  const dau = s * 0.17
  const cy = y - s + dau
  // thân
  c.fillStyle = k.ao
  c.strokeStyle = 'rgba(0,0,0,0.25)'
  c.lineWidth = Math.max(1, s * 0.006)
  const rongThan = s * 0.34
  c.beginPath()
  c.roundRect(x - rongThan / 2, cy + dau * 0.9, rongThan, s * (chiNuaTren ? 0.6 : 0.42), [s * 0.08, s * 0.08, s * 0.03, s * 0.03])
  c.fill(); c.stroke()
  if (k.dongPhuc) {
    // cổ áo + huy hiệu
    c.fillStyle = '#E9EEF5'
    c.beginPath(); c.moveTo(x - dau * 0.45, cy + dau * 0.95); c.lineTo(x, cy + dau * 1.35); c.lineTo(x + dau * 0.45, cy + dau * 0.95); c.fill()
    c.fillStyle = '#C62828'
    c.beginPath(); c.arc(x - rongThan * 0.25, cy + dau * 1.6, s * 0.018, 0, Math.PI * 2); c.fill()
  }
  if (!chiNuaTren) {
    c.fillStyle = k.dongPhuc ? '#2B3A67' : '#3B3B46'
    c.fillRect(x - rongThan * 0.42, cy + dau * 0.9 + s * 0.4, rongThan * 0.36, s * 0.3)
    c.fillRect(x + rongThan * 0.06, cy + dau * 0.9 + s * 0.4, rongThan * 0.36, s * 0.3)
  }
  // tóc phía sau (tóc dài)
  c.fillStyle = k.tocBac ? '#9C9894' : k.toc
  if (k.kieuToc === 'dai') { c.beginPath(); c.roundRect(x - dau * 1.05, cy - dau * 0.2, dau * 2.1, dau * 2.0, dau * 0.6); c.fill() }
  // đầu
  c.fillStyle = k.da
  c.beginPath(); c.arc(x, cy, dau, 0, Math.PI * 2); c.fill()
  // tóc trên đầu
  c.fillStyle = k.tocBac ? '#9C9894' : k.toc
  c.beginPath(); c.arc(x, cy - dau * 0.15, dau * 1.02, Math.PI * 1.02, Math.PI * 1.98); c.fill()
  if (k.kieuToc === 'buoc') { c.beginPath(); c.arc(x, cy - dau * 1.05, dau * 0.38, 0, Math.PI * 2); c.fill() }
  // mắt, miệng, má
  c.fillStyle = '#2A2220'
  c.beginPath(); c.arc(x - dau * 0.36, cy + dau * 0.05, dau * 0.09, 0, Math.PI * 2); c.arc(x + dau * 0.36, cy + dau * 0.05, dau * 0.09, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#7A3B2E'; c.lineWidth = Math.max(1, dau * 0.08); c.lineCap = 'round'
  c.beginPath(); c.arc(x, cy + dau * 0.3, dau * 0.28, Math.PI * 0.15, Math.PI * 0.85); c.stroke()
  c.fillStyle = 'rgba(232,110,110,0.35)'
  c.beginPath(); c.arc(x - dau * 0.58, cy + dau * 0.32, dau * 0.15, 0, Math.PI * 2); c.arc(x + dau * 0.58, cy + dau * 0.32, dau * 0.15, 0, Math.PI * 2); c.fill()
  if (k.kinh) {
    c.strokeStyle = '#2A2220'; c.lineWidth = Math.max(1, dau * 0.06)
    c.beginPath(); c.arc(x - dau * 0.36, cy + dau * 0.05, dau * 0.24, 0, Math.PI * 2); c.stroke()
    c.beginPath(); c.arc(x + dau * 0.36, cy + dau * 0.05, dau * 0.24, 0, Math.PI * 2); c.stroke()
    c.beginPath(); c.moveTo(x - dau * 0.12, cy + dau * 0.05); c.lineTo(x + dau * 0.12, cy + dau * 0.05); c.stroke()
  }
}

/** Phủ màu ảnh cũ: ngả vàng, hạt, viền tối, khung trắng có ngày tháng. */
function lamCu(c: CanvasRenderingContext2D, w: number, h: number, r: Rng, ngay?: string) {
  c.globalCompositeOperation = 'multiply'
  c.fillStyle = 'rgba(214,178,120,0.55)'
  c.fillRect(0, 0, w, h)
  c.globalCompositeOperation = 'source-over'
  c.fillStyle = 'rgba(255,240,210,0.18)'
  c.fillRect(0, 0, w, h)
  for (let i = 0; i < w * h / 600; i++) {
    c.fillStyle = `rgba(60,40,20,${r() * 0.12})`
    c.fillRect(r() * w, r() * h, 1.5, 1.5)
  }
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75)
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,35,10,0.45)')
  c.fillStyle = g; c.fillRect(0, 0, w, h)
  if (ngay) {
    c.font = `bold ${Math.round(h * 0.045)}px monospace`
    c.fillStyle = 'rgba(255,140,40,0.9)'
    c.textAlign = 'right'
    c.fillText(ngay, w - w * 0.04, h - h * 0.05)
  }
}

function taoCanvas(w: number, h: number) {
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const c = cv.getContext('2d')!
  return { cv, c }
}

async function thanhFile(cv: HTMLCanvasElement, ten: string): Promise<File> {
  const blob: Blob = await new Promise((ok) => cv.toBlob((b) => ok(b!), 'image/jpeg', 0.88))
  return new File([blob], ten, { type: 'image/jpeg' })
}

/* ---------------- Chân dung ---------------- */
export async function veChanDung(seed: number, nu: boolean, kieu: 'xua' | 'nay', namRaTruong: number): Promise<File> {
  const r = taoRng(seed)
  const W = 800, H = 800
  const { cv, c } = taoCanvas(W, H)
  const goc = nguoiNgauNhien(taoRng(seed * 7 + 1), nu, kieu === 'xua', kieu === 'nay')
  if (kieu === 'nay') { goc.toc = taoRng(seed * 7 + 1)() < 0.3 ? '#6E6A66' : goc.toc }
  c.fillStyle = kieu === 'xua' ? '#DCE6F0' : chon(r, NEN)
  c.fillRect(0, 0, W, H)
  if (kieu === 'nay') {
    for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`; c.beginPath(); c.arc(r() * W, r() * H * 0.6, 20 + r() * 50, 0, Math.PI * 2); c.fill() }
  }
  veNguoi(c, W / 2, H * 1.15, H * 0.95, goc, true)
  if (kieu === 'xua') lamCu(c, W, H, r, `'${String(namRaTruong).slice(2)} 05 ${String(10 + Math.floor(r() * 18))}`)
  return thanhFile(cv, `chan-dung-${kieu}-${seed}.jpg`)
}

/* ---------------- Cảnh ---------------- */
export type KieuCanh = 'lop-hoc' | 'san-truong' | 'cam-trai' | 'be-giang' | 'van-nghe' | 'tap-the' | 'hop-lop'

function veCay(c: CanvasRenderingContext2D, x: number, y: number, s: number, r: Rng, phuong: boolean) {
  c.fillStyle = '#6B4A2E'
  c.fillRect(x - s * 0.05, y - s * 0.5, s * 0.1, s * 0.5)
  for (let i = 0; i < 9; i++) {
    c.fillStyle = i % 3 === 0 ? '#3F7D3A' : '#4E9445'
    c.beginPath(); c.arc(x + (r() - 0.5) * s * 0.7, y - s * 0.55 - r() * s * 0.35, s * (0.16 + r() * 0.1), 0, Math.PI * 2); c.fill()
  }
  if (phuong) for (let i = 0; i < 40; i++) {
    c.fillStyle = r() < 0.5 ? '#E53935' : '#FF6F43'
    c.beginPath(); c.arc(x + (r() - 0.5) * s * 0.8, y - s * 0.5 - r() * s * 0.45, s * 0.03, 0, Math.PI * 2); c.fill()
  }
}

function veHangNguoi(c: CanvasRenderingContext2D, r: Rng, so: number, x0: number, x1: number, y: number, s: number, dongPhuc: boolean, lon: boolean) {
  for (let i = 0; i < so; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / so + (r() - 0.5) * s * 0.08
    veNguoi(c, x, y + (r() - 0.5) * s * 0.04, s * (0.92 + r() * 0.12), nguoiNgauNhien(r, r() < 0.5, dongPhuc, lon))
  }
}

function chu(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, mau: string, canh: CanvasTextAlign = 'center') {
  c.font = `bold ${size}px "Be Vietnam Pro", system-ui, sans-serif`
  c.fillStyle = mau; c.textAlign = canh
  c.fillText(text, x, y)
}

export async function veCanh(kieu: KieuCanh, seed: number, tenLop: string, nam: number, nhan?: string): Promise<File> {
  const r = taoRng(seed)
  const W = 1200, H = 900
  const { cv, c } = taoCanvas(W, H)
  const cu = kieu !== 'hop-lop'

  switch (kieu) {
    case 'lop-hoc': {
      c.fillStyle = '#F2E6C9'; c.fillRect(0, 0, W, H)
      c.fillStyle = '#C9B48A'; c.fillRect(0, H * 0.62, W, H * 0.38)
      c.fillStyle = '#7A5A3A'; c.fillRect(W * 0.18, H * 0.08, W * 0.64, H * 0.34)
      c.fillStyle = '#2E5A44'; c.fillRect(W * 0.2, H * 0.1, W * 0.6, H * 0.3)
      chu(c, `Lớp ${tenLop}`, W / 2, H * 0.2, 46, '#F4F1E8')
      chu(c, nhan ?? 'Thứ hai, ngày 5 tháng 9', W / 2, H * 0.29, 28, '#E8E4D8')
      for (let hang = 0; hang < 2; hang++) {
        const y = H * (0.78 + hang * 0.2)
        veHangNguoi(c, r, 5, W * 0.05, W * 0.95, y, H * 0.42, true, false)
        c.fillStyle = '#9B6B3E'; c.fillRect(W * 0.04, y - H * 0.16, W * 0.92, H * 0.05)
      }
      break
    }
    case 'san-truong': {
      c.fillStyle = '#BFE3F5'; c.fillRect(0, 0, W, H)
      c.fillStyle = '#F2D7A6'; c.fillRect(W * 0.05, H * 0.2, W * 0.6, H * 0.35)
      for (let i = 0; i < 6; i++) { c.fillStyle = '#7FB3D5'; c.fillRect(W * (0.08 + i * 0.095), H * 0.28, W * 0.06, H * 0.08) }
      c.fillStyle = '#D8C7A0'; c.fillRect(0, H * 0.55, W, H * 0.45)
      veCay(c, W * 0.82, H * 0.62, H * 0.75, r, true)
      veHangNguoi(c, r, 6, W * 0.05, W * 0.7, H * 0.96, H * 0.42, true, false)
      break
    }
    case 'cam-trai': {
      c.fillStyle = '#1B2440'; c.fillRect(0, 0, W, H)
      for (let i = 0; i < 80; i++) { c.fillStyle = `rgba(255,255,230,${0.4 + r() * 0.6})`; c.fillRect(r() * W, r() * H * 0.5, 2, 2) }
      c.fillStyle = '#2E4A2B'; c.fillRect(0, H * 0.6, W, H * 0.4)
      for (let i = 0; i < 3; i++) {
        const x = W * (0.15 + i * 0.32)
        c.fillStyle = ['#E0802E', '#3E7CB1', '#C0392B'][i]
        c.beginPath(); c.moveTo(x - 120, H * 0.66); c.lineTo(x, H * 0.4); c.lineTo(x + 120, H * 0.66); c.fill()
      }
      const g = c.createRadialGradient(W / 2, H * 0.82, 10, W / 2, H * 0.82, 260)
      g.addColorStop(0, 'rgba(255,200,80,0.7)'); g.addColorStop(1, 'rgba(255,120,30,0)')
      c.fillStyle = g; c.fillRect(0, H * 0.5, W, H * 0.5)
      c.fillStyle = '#FFB300'; c.beginPath(); c.moveTo(W / 2 - 50, H * 0.88); c.lineTo(W / 2, H * 0.7); c.lineTo(W / 2 + 50, H * 0.88); c.fill()
      c.fillStyle = '#FF7043'; c.beginPath(); c.moveTo(W / 2 - 28, H * 0.88); c.lineTo(W / 2, H * 0.77); c.lineTo(W / 2 + 28, H * 0.88); c.fill()
      veHangNguoi(c, r, 3, W * 0.02, W * 0.36, H * 0.98, H * 0.36, false, false)
      veHangNguoi(c, r, 3, W * 0.64, W * 0.98, H * 0.98, H * 0.36, false, false)
      chu(c, nhan ?? 'Hội trại 26/3', W / 2, H * 0.12, 44, '#FFE08A')
      break
    }
    case 'be-giang': {
      c.fillStyle = '#FFF4E0'; c.fillRect(0, 0, W, H)
      c.fillStyle = '#B71C1C'; c.fillRect(W * 0.08, H * 0.06, W * 0.84, H * 0.16)
      chu(c, nhan ?? `LỄ BẾ GIẢNG NĂM HỌC ${nam - 1}–${nam}`, W / 2, H * 0.16, 34, '#FFD54F')
      veCay(c, W * 0.1, H * 0.72, H * 0.6, r, true)
      veCay(c, W * 0.92, H * 0.72, H * 0.6, r, true)
      veHangNguoi(c, r, 6, W * 0.12, W * 0.88, H * 0.74, H * 0.36, true, false)
      veHangNguoi(c, r, 7, W * 0.08, W * 0.92, H * 1.0, H * 0.4, true, false)
      for (let i = 0; i < 5; i++) { c.fillStyle = chon(r, ['#E91E63', '#FFEB3B', '#FF5722']); c.beginPath(); c.arc(W * (0.2 + i * 0.15), H * 0.62, 14, 0, Math.PI * 2); c.fill() }
      break
    }
    case 'van-nghe': {
      c.fillStyle = '#5D1A1A'; c.fillRect(0, 0, W, H)
      for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#8E2424' : '#A32B2B'; c.fillRect(i * W / 12, 0, W / 12, H * 0.7) }
      c.fillStyle = '#C79A55'; c.fillRect(0, H * 0.7, W, H * 0.3)
      const g = c.createRadialGradient(W / 2, H * 0.55, 20, W / 2, H * 0.55, 420)
      g.addColorStop(0, 'rgba(255,240,200,0.45)'); g.addColorStop(1, 'rgba(255,240,200,0)')
      c.fillStyle = g; c.fillRect(0, 0, W, H)
      veHangNguoi(c, r, 4, W * 0.2, W * 0.8, H * 0.86, H * 0.5, true, false)
      chu(c, nhan ?? 'Văn nghệ chào mừng 20/11', W / 2, H * 0.1, 40, '#FFE08A')
      break
    }
    case 'tap-the': {
      c.fillStyle = '#CFE8F7'; c.fillRect(0, 0, W, H)
      c.fillStyle = '#F3D9A4'; c.fillRect(W * 0.04, H * 0.1, W * 0.92, H * 0.45)
      c.fillStyle = '#C0392B'; c.fillRect(W * 0.04, H * 0.06, W * 0.92, H * 0.06)
      chu(c, nhan ?? `TẬP THỂ LỚP ${tenLop.toUpperCase()} · ${nam - 3}–${nam}`, W / 2, H * 0.105, 30, '#FFE08A')
      c.fillStyle = '#D9C9A3'; c.fillRect(0, H * 0.55, W, H * 0.45)
      veHangNguoi(c, r, 9, W * 0.04, W * 0.96, H * 0.72, H * 0.3, true, false)
      veHangNguoi(c, r, 9, W * 0.02, W * 0.98, H * 0.86, H * 0.33, true, false)
      veHangNguoi(c, r, 8, W * 0.06, W * 0.94, H * 1.02, H * 0.36, true, false)
      break
    }
    case 'hop-lop': {
      c.fillStyle = '#FFF3E0'; c.fillRect(0, 0, W, H)
      for (let i = 0; i < 8; i++) { c.fillStyle = chon(r, ['#FFCDD2', '#FFE082', '#C5E1A5', '#B3E5FC']); c.beginPath(); c.arc(W * (0.06 + i * 0.125), H * 0.08, 34, 0, Math.PI * 2); c.fill() }
      c.fillStyle = '#C62828'; c.fillRect(W * 0.18, H * 0.14, W * 0.64, H * 0.12)
      chu(c, nhan ?? 'HỌP LỚP · NGÀY GẶP LẠI', W / 2, H * 0.215, 36, '#FFF8E1')
      veHangNguoi(c, r, 7, W * 0.04, W * 0.96, H * 0.82, H * 0.48, false, true)
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(W / 2, H * 0.92, W * 0.46, H * 0.12, 0, 0, Math.PI * 2); c.fill()
      for (let i = 0; i < 6; i++) { c.fillStyle = chon(r, ['#E57373', '#FFB74D', '#81C784', '#64B5F6']); c.beginPath(); c.arc(W * (0.2 + i * 0.12), H * 0.9, 26, 0, Math.PI * 2); c.fill() }
      break
    }
  }
  if (cu) lamCu(c, W, H, r, `'${String(nam).slice(2)} ${String(1 + Math.floor(r() * 12)).padStart(2, '0')} ${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`)
  return thanhFile(cv, `${kieu}-${seed}.jpg`)
}
