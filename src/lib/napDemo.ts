import { supabase } from './supabase'
import { guiAnh, mucAnh } from './guiAnh'
import { veCanh, veChanDung, taoRng, type KieuCanh } from './veAnhDemo'
import {
  dsThanhVien, themThanhVien, phanTichDanhSach, laySoDo, luuSoDo, khoaCho,
  ganAnhChoBan, datAnhBia, datAnhTapThe, type LopQuanTri,
} from './quanTri'

const DS_DEMO = `Nguyễn Văn Hùng | Hùng Còi | Đà Nẵng | Ai đi xa nhất thì phải về sớm nhất!
Phạm Thị Lan | Lan Béo | Hà Nội | Nhớ mãi mùa phượng năm ấy.
Lê Anh Tuấn | Tuấn Đen | TP.HCM | Lớp mình mãi là số một.
Đỗ Thị Mai | Mai Mực | Hà Nội | Đừng quên nhau nhé.
Trần Quốc Dũng | Dũng Xoăn | Hải Phòng | Ra trường rồi vẫn nợ cô bài kiểm tra.
Vũ Thu Hà | Hà Kều | Hà Nội | Thanh xuân là có các cậu.
Bùi Hoài Nam | Nam Toán | Singapore | Giải xong đề rồi mới được về.
Đặng Văn Long | Long Mập | Hà Nội | Ai trực nhật hôm nay?
Ngô Phương Thảo | Thảo Lớp Phó | Hà Nội | Sổ đầu bài vẫn còn đây.
Hoàng Minh Quân | Quân Bóng | Đà Nẵng | Chiều nay đá bóng không?
Lý Bảo Ngọc | Ngọc Nhí | Hà Nội | Cười lên nào!
Phan Thanh Phong | Phong Guitar | Huế | Hát lại bài năm ấy đi.
Mạc Thu Huyền | Huyền Tóc Dài | Hà Nội | Nhớ căng tin cô Tư.
Tạ Minh Đức | Đức Ngủ Gật | TP.HCM | Tiết đầu là để ngủ.
Cao Mỹ Linh | Linh Lém | Hà Nội | Hẹn nhau mùng 4 Tết.
Đinh Đăng Khoa | Khoa Kính | Hà Nội | Mượn vở chép bài với.
Lương Thu Trang | Trang Văn | Bắc Ninh | Bài văn cuối cùng viết về các cậu.
Kiều Hải Sơn | Sơn Lớp Trưởng | Hà Nội | Cả lớp trật tự!
Hồ Hải Yến | Yến Nhút Nhát | Úc | Xa mấy cũng nhớ lớp.
Chu Quốc Việt | Việt Chạy | Hà Nội | Ai về chậm nhất thì trả tiền.
Mai Thị Hoa | Hoa Phượng | Nghệ An | Phượng vẫn nở mỗi tháng Năm.
Triệu Thanh Bình | Bình Bóng Bàn | Hà Nội | Chơi một ván nữa thôi.
Âu Tường Vy | Vy Vẽ | Hà Nội | Vẽ lại sơ đồ lớp này là tớ đấy.
Lâm Trung Kiên | Kiên Đô | Hải Dương | Năm sau tớ bao.`

const NU = /\b(Thị|Thu|Lan|Mai|Hà|Thảo|Ngọc|Huyền|Linh|Trang|Yến|Hoa|Vy|Nga|Châu)\b/

/** Kế hoạch ảnh xưa: mục, kiểu cảnh, chú thích. */
function keHoachAnhXua(nam: number): { muc: string; kieu: KieuCanh; chuThich: string; nhan?: string }[] {
  return [
    { muc: 'lop-10', kieu: 'lop-hoc', chuThich: `Buổi học đầu tiên năm lớp 10`, nhan: `Ngày 5 tháng 9 năm ${nam - 3}` },
    { muc: 'lop-10', kieu: 'van-nghe', chuThich: 'Văn nghệ chào mừng 20/11' },
    { muc: 'lop-10', kieu: 'san-truong', chuThich: 'Giờ ra chơi dưới gốc phượng' },
    { muc: 'lop-11', kieu: 'cam-trai', chuThich: 'Hội trại 26/3, lớp mình dựng trại đẹp nhất' },
    { muc: 'lop-11', kieu: 'lop-hoc', chuThich: 'Tiết Văn của cô chủ nhiệm', nhan: 'Bài 12: Tuổi trẻ và tương lai' },
    { muc: 'lop-11', kieu: 'san-truong', chuThich: 'Lao động trồng cây' },
    { muc: 'lop-12', kieu: 'lop-hoc', chuThich: 'Những ngày ôn thi', nhan: `Còn 45 ngày thi tốt nghiệp` },
    { muc: 'lop-12', kieu: 'tap-the', chuThich: 'Chụp ảnh kỷ yếu' },
    { muc: 'lop-12', kieu: 'san-truong', chuThich: 'Áo trắng sân trường' },
    { muc: 'cam-trai', kieu: 'cam-trai', chuThich: 'Lửa trại đêm cuối', nhan: 'Đêm lửa trại' },
    { muc: 'cam-trai', kieu: 'cam-trai', chuThich: 'Cả lớp hát quanh đống lửa', nhan: 'Trại hè Ba Vì' },
    { muc: 'be-giang', kieu: 'be-giang', chuThich: 'Lễ bế giảng' },
    { muc: 'be-giang', kieu: 'tap-the', chuThich: 'Ảnh tập thể ngày bế giảng' },
    { muc: 'be-giang', kieu: 'san-truong', chuThich: 'Lần cuối mặc áo trắng' },
  ]
}

export async function napDemo(lop: LopQuanTri, bao: (text: string) => void): Promise<{ soAnh: number }> {
  const nam = lop.nien_khoa_ket_thuc ?? 2006
  const seedLop = [...lop.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
  let soAnh = 0
  const gui1 = async (file: File, opts: { muc?: string; chuThich?: string; chuongId?: string }) => {
    const r = await guiAnh([file], { khoa: lop.ma, nguoiGui: 'Ảnh minh họa', ...opts }, () => {})
    if (r.loi) throw new Error(r.loi)
    soAnh += r.ids.length
    return r.ids[0]
  }

  // 1. Thành viên + sơ đồ (chỉ khi lớp chưa có ai)
  let tv = await dsThanhVien(lop.id)
  if (!tv.length) {
    bao('Đang thêm 24 bạn mẫu và xếp sơ đồ…')
    await themThanhVien(lop.id, phanTichDanhSach(DS_DEMO), 0)
    tv = await dsThanhVien(lop.id)
    const sd = await laySoDo(lop.id)
    const so = { so_day: 4, so_ban_moi_day: 3, cho_moi_ban: 2, cho: {} as Record<string, string | null> }
    let i = 0
    for (let d = 0; d < 4; d++) for (let b = 0; b < 3; b++) for (let v = 0; v < 2; v++) so.cho[khoaCho(d, b, v)] = tv[i++]?.id ?? null
    await luuSoDo(lop.id, { ...sd, ...so })
  }

  // Nếu lần trước dừng giữa chừng: bỏ qua phần đã có, làm tiếp phần còn thiếu
  const { count: soCanhDaCo } = await supabase.from('anh').select('id', { count: 'exact', head: true })
    .eq('lop_id', lop.id).eq('loai', 'xua').neq('muc', 'chan-dung').like('chu_thich', '%(ảnh minh họa)')
  const { data: daCoAnh } = await supabase.from('thanh_vien').select('id, anh_xua_id, anh_nay_id').eq('lop_id', lop.id)
  const coAnh = new Map((daCoAnh ?? []).map((t) => [t.id, t]))
  const { count: soChuong } = await supabase.from('chuong').select('id', { count: 'exact', head: true }).eq('lop_id', lop.id)

  // Kế hoạch viết theo THPT (lớp 10–12): lớp cấp khác thì dùng 3 năm cuối của cấp đó
  const namCuoi = mucAnh(lop.cap).filter((m) => /^(lop|nam)-/.test(m.ma)).slice(-3).map((m) => m.ma)
  const doiMuc = (m: string) => ({ 'lop-10': namCuoi[0], 'lop-11': namCuoi[1], 'lop-12': namCuoi[2] } as Record<string, string>)[m] ?? m

  // 2. Kho ảnh xưa + ảnh bìa
  const ke = (soCanhDaCo ?? 0) >= 14 ? [] : keHoachAnhXua(nam)
  let anhBia: string | undefined
  for (let i = 0; i < ke.length; i++) {
    bao(`Đang vẽ và tải ảnh xưa ${i + 1}/${ke.length}…`)
    const k = ke[i]
    const file = await veCanh(k.kieu, seedLop + i * 101, lop.ten_lop, nam, k.nhan)
    const id = await gui1(file, { muc: doiMuc(k.muc), chuThich: `${k.chuThich} (ảnh minh họa)` })
    if (k.kieu === 'tap-the' && k.muc === 'be-giang') anhBia = id
  }
  if (anhBia) await datAnhBia(lop.id, anhBia)

  // 3. Chân dung ngày ấy – bây giờ cho từng bạn
  const dsChanDung = tv.slice(0, 40)
  for (let i = 0; i < dsChanDung.length; i++) {
    const t = dsChanDung[i]
    const cu = coAnh.get(t.id)
    if (cu?.anh_xua_id && cu?.anh_nay_id) continue
    bao(`Đang vẽ chân dung ${i + 1}/${dsChanDung.length}: ${t.ho_ten}…`)
    const seed = seedLop + 5000 + i * 13
    const nu = NU.test(t.ho_ten) || (!/\bVăn\b/.test(t.ho_ten) && taoRng(seed)() < 0.4)
    const xua = await gui1(await veChanDung(seed, nu, 'xua', nam), { muc: 'chan-dung', chuThich: `${t.ho_ten} ngày ấy (ảnh minh họa)` })
    const nay = await gui1(await veChanDung(seed, nu, 'nay', nam), { muc: 'chan-dung', chuThich: `${t.ho_ten} bây giờ (ảnh minh họa)` })
    if (xua) await ganAnhChoBan(t.id, 'anh_xua_id', xua)
    if (nay) await ganAnhChoBan(t.id, 'anh_nay_id', nay)
  }

  // 4. Hai chương: một lần họp đã qua (có ảnh) và một lần sắp tới
  if ((soChuong ?? 0) > 0) {
    // Lớp đã có các lần họp (nạp từ trước): chọn ảnh tập thể cho buổi nào còn thiếu
    const { data: dsCh } = await supabase.from('chuong').select('id').eq('lop_id', lop.id).is('anh_tap_the_id', null)
    for (const ch of dsCh ?? []) {
      const { data: a } = await supabase.from('anh').select('id').eq('chuong_id', ch.id).eq('trang_thai', 'da-duyet').order('tao_luc').limit(1)
      if (a?.[0]) await datAnhTapThe(ch.id, a[0].id)
    }
    bao(`Xong! Đã nạp ${soAnh} ảnh demo.`); return { soAnh }
  }
  bao('Đang tạo các lần họp lớp…')
  const homNay = new Date()
  const namTruoc = homNay.getFullYear() - 1
  const soNamTruoc = namTruoc - nam
  const { data: chQua, error: e1 } = await supabase.from('chuong').insert({
    lop_id: lop.id, tieu_de: `Họp lớp ${soNamTruoc} năm · Tết ${namTruoc}`, ngay: `${namTruoc}-02-${String(10 + (seedLop % 10)).padStart(2, '0')}`,
    dia_diem: 'Nhà hàng [Tên nhà hàng]', thu_tu: 1,
    mo_ta: 'Lần đầu gặp lại đông đủ sau nhiều năm. (nội dung minh họa)',
  }).select('id, ma_qr').single()
  if (e1) throw e1
  const ngaySap = new Date(homNay.getTime() + 1000 * 86400 * (40 + (seedLop % 40)))
  const { error: e2 } = await supabase.from('chuong').insert({
    lop_id: lop.id, tieu_de: `Họp lớp ${ngaySap.getFullYear() - nam} năm`, ngay: ngaySap.toISOString().slice(0, 10),
    dia_diem: 'Nhà hàng [Tên nhà hàng]', thu_tu: 2,
  })
  if (e2) throw e2
  for (let i = 0; i < 4; i++) {
    bao(`Đang tải ảnh buổi họp ${i + 1}/4…`)
    const file = await veCanh('hop-lop', seedLop + 9000 + i * 7, lop.ten_lop, namTruoc, `HỌP LỚP ${lop.ten_lop.toUpperCase()} · ${soNamTruoc} NĂM`)
    const id = await gui1(file, { chuongId: chQua.id, chuThich: 'Buổi họp lớp (ảnh minh họa)' })
    if (i === 0 && id) await datAnhTapThe(chQua.id, id)
  }

  bao(`Xong! Đã nạp ${soAnh} ảnh demo.`)
  return { soAnh }
}

/**
 * Xóa đúng những gì nút "Nạp ảnh demo" đã tạo, giữ nguyên dữ liệu thật của lớp:
 *  - ảnh có người gửi "Ảnh minh họa" (cả file trên kho)
 *  - các bạn có họ tên nằm trong danh sách 24 bạn mẫu
 *  - các buổi họp minh họa (mô tả "(nội dung minh họa)" hoặc địa điểm "Nhà hàng [Tên nhà hàng]") chưa có ảnh thật
 */
export async function xoaDemo(lop: LopQuanTri, bao: (s: string) => void): Promise<{ anh: number; ban: number; buoi: number }> {
  const { xoaNhieu } = await import('./storage')
  bao('Đang tìm dữ liệu demo…')
  const { data: anh, error: e1 } = await supabase.from('anh').select('id, duong_dan_xem, duong_dan_goc')
    .eq('lop_id', lop.id).eq('nguoi_gui_ten', 'Ảnh minh họa')
  if (e1) throw e1
  const idAnh = (anh ?? []).map((a) => a.id)
  if (idAnh.length) {
    bao(`Đang xóa ${idAnh.length} ảnh minh họa…`)
    await xoaNhieu((anh ?? []).flatMap((a) => [a.duong_dan_xem, a.duong_dan_goc]))
    // Gỡ các chỗ đang trỏ tới ảnh sắp xóa (ảnh bìa, ảnh ngày ấy/bây giờ, ảnh tập thể)
    await supabase.from('lop').update({ anh_bia_id: null }).eq('id', lop.id).in('anh_bia_id', idAnh)
    await supabase.from('thanh_vien').update({ anh_xua_id: null }).eq('lop_id', lop.id).in('anh_xua_id', idAnh)
    await supabase.from('thanh_vien').update({ anh_nay_id: null }).eq('lop_id', lop.id).in('anh_nay_id', idAnh)
    await supabase.from('chuong').update({ anh_tap_the_id: null }).eq('lop_id', lop.id).in('anh_tap_the_id', idAnh)
    for (let i = 0; i < idAnh.length; i += 100) {
      const { error } = await supabase.from('anh').delete().in('id', idAnh.slice(i, i + 100))
      if (error) throw error
    }
  }

  bao('Đang xóa các bạn mẫu…')
  // Chỉ xóa bạn trùng cả họ tên, biệt danh lẫn câu lưu bút với danh sách mẫu: lớp thật có bạn trùng tên vẫn an toàn
  const mau = new Set(phanTichDanhSach(DS_DEMO).map((t) => `${t.ho_ten}|${t.biet_danh}|${t.cau_luu_but}`))
  const { data: tv, error: e2 } = await supabase.from('thanh_vien').select('id, ho_ten, biet_danh, cau_luu_but').eq('lop_id', lop.id)
  if (e2) throw e2
  const idBan = (tv ?? []).filter((t) => mau.has(`${t.ho_ten}|${t.biet_danh}|${t.cau_luu_but}`)).map((t) => t.id)
  if (idBan.length) {
    const { error } = await supabase.from('thanh_vien').delete().in('id', idBan)
    if (error) throw error
  }
  const ban = idBan

  bao('Đang xóa các buổi họp minh họa…')
  const { data: buoi } = await supabase.from('chuong').select('id, mo_ta, dia_diem').eq('lop_id', lop.id)
  const buoiDemo = (buoi ?? []).filter((c) => (c.mo_ta ?? '').includes('(nội dung minh họa)') || c.dia_diem === 'Nhà hàng [Tên nhà hàng]')
  let soBuoi = 0
  for (const c of buoiDemo) {
    const { count } = await supabase.from('anh').select('id', { count: 'exact', head: true }).eq('chuong_id', c.id)
    if (count) continue // buổi đã có ảnh thật thì giữ lại
    const { error } = await supabase.from('chuong').delete().eq('id', c.id)
    if (!error) soBuoi++
  }
  const kq = { anh: idAnh.length, ban: ban.length, buoi: soBuoi }
  bao(`Xong: đã xóa ${kq.anh} ảnh, ${kq.ban} bạn mẫu, ${kq.buoi} buổi họp minh họa.`)
  return kq
}
