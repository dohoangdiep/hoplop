-- hoplop: các lần họp lớp (chương) và trang gửi ảnh qua QR tại buổi họp
-- Chạy trong Supabase → SQL Editor sau file 0004.

-- Thông tin tối thiểu để hiện trang gửi ảnh qua QR (không cần mật khẩu lớp).
-- Chỉ trả tên lớp, trường, giao diện và tên buổi họp; không lộ thành viên hay ảnh.
create or replace function public.thong_tin_qr(p_khoa text, p_ma_qr text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  l lop%rowtype;
  c chuong%rowtype;
begin
  select * into l from lop where (ma = lower(p_khoa) or ten_goi = lower(p_khoa)) and trang_thai <> 'luu-tru'
  order by (ma = lower(p_khoa)) desc limit 1;
  if not found then return jsonb_build_object('loi', 'khong-tim-thay'); end if;
  select * into c from chuong where lop_id = l.id and ma_qr = p_ma_qr;
  if not found then return jsonb_build_object('loi', 'qr-sai'); end if;
  return jsonb_build_object(
    'lop', jsonb_build_object('ma', l.ma, 'ten_lop', l.ten_lop, 'truong', l.truong, 'giao_dien', l.giao_dien,
                              'nien_khoa_bat_dau', l.nien_khoa_bat_dau, 'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc),
    'chuong', jsonb_build_object('tieu_de', c.tieu_de, 'ngay', c.ngay, 'dia_diem', c.dia_diem),
    'trang_thai', case
      when l.trang_thai in ('chi-xem') then 'chi-xem'
      when c.qr_hieu_luc_tu is not null and now() < c.qr_hieu_luc_tu then 'chua-mo'
      when c.qr_hieu_luc_den is not null and now() > c.qr_hieu_luc_den then 'het-han'
      else 'mo' end,
    'mo_tu', c.qr_hieu_luc_tu, 'mo_den', c.qr_hieu_luc_den);
end $$;
grant execute on function public.thong_tin_qr(text, text) to anon, authenticated;

-- ===== xem_lop: thêm mô tả, video, ảnh tập thể của từng lần họp =====
create or replace function public.xem_lop(p_khoa text, p_mat_khau text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  l lop%rowtype;
  so_lan_sai int;
begin
  select * into l from lop
  where (ma = lower(p_khoa) or ten_goi = lower(p_khoa)) and trang_thai <> 'luu-tru'
  order by (ma = lower(p_khoa)) desc limit 1;
  if not found then return jsonb_build_object('loi', 'khong-tim-thay'); end if;

  if not (l.cong_khai or quan_tri_duoc_lop(l.id)) then
    select count(*) into so_lan_sai from lan_nhap_sai
      where lop_id = l.id and luc > now() - interval '10 minutes';
    if so_lan_sai >= 10 then return jsonb_build_object('loi', 'tam-khoa'); end if;

    if p_mat_khau is null or l.mat_khau_hash is null
       or l.mat_khau_hash <> crypt(p_mat_khau, l.mat_khau_hash) then
      if p_mat_khau is not null then insert into lan_nhap_sai(lop_id) values (l.id); end if;
      return jsonb_build_object('loi', 'can-mat-khau',
        'lop', jsonb_build_object('ten_lop', l.ten_lop, 'truong', l.truong, 'giao_dien', l.giao_dien,
                                  'nien_khoa_bat_dau', l.nien_khoa_bat_dau, 'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc));
    end if;
  end if;

  return jsonb_build_object(
    'lop', jsonb_build_object(
      'id', l.id, 'ma', l.ma, 'ten_goi', l.ten_goi, 'ten_lop', l.ten_lop, 'truong', l.truong, 'tinh', l.tinh,
      'nien_khoa_bat_dau', l.nien_khoa_bat_dau, 'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc,
      'giao_dien', l.giao_dien, 'trang_thai', l.trang_thai,
      'anh_bia', (select a.duong_dan_xem from anh a where a.id = l.anh_bia_id and a.trang_thai = 'da-duyet')),
    'thanh_vien', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'ho_ten', t.ho_ten, 'ten_goi_tat', t.ten_goi_tat, 'biet_danh', t.biet_danh,
        'noi_o', case when t.an_thong_tin then null else t.noi_o end,
        'cau_luu_but', t.cau_luu_but,
        'anh_xua', (select a.duong_dan_xem from anh a where a.id = t.anh_xua_id and a.trang_thai = 'da-duyet'),
        'anh_nay', (select a.duong_dan_xem from anh a where a.id = t.anh_nay_id and a.trang_thai = 'da-duyet')
      ) order by t.thu_tu, t.ho_ten)
      from thanh_vien t where t.lop_id = l.id), '[]'::jsonb),
    'so_do', (select jsonb_build_object('so_day', s.so_day, 'so_ban_moi_day', s.so_ban_moi_day, 'cho_moi_ban', s.cho_moi_ban)
              from so_do s where s.lop_id = l.id),
    'cho_ngoi', coalesce((
      select jsonb_agg(jsonb_build_object('day', c.day, 'ban', c.ban, 'vi_tri', c.vi_tri, 'thanh_vien_id', c.thanh_vien_id))
      from cho_ngoi c where c.lop_id = l.id), '[]'::jsonb),
    'chuong', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'tieu_de', c.tieu_de, 'ngay', c.ngay, 'dia_diem', c.dia_diem,
                       'mo_ta', c.mo_ta, 'video_url', c.video_url,
                       'anh_tap_the', (select a.duong_dan_xem from anh a where a.id = c.anh_tap_the_id and a.trang_thai = 'da-duyet'))
                       order by c.ngay desc nulls last, c.thu_tu desc)
      from chuong c where c.lop_id = l.id), '[]'::jsonb),
    'anh', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'loai', a.loai, 'muc', a.muc, 'chuong_id', a.chuong_id,
                                          'chu_thich', a.chu_thich, 'xem', a.duong_dan_xem) order by a.tao_luc)
      from anh a where a.lop_id = l.id and a.trang_thai = 'da-duyet' and a.da_tai_xong), '[]'::jsonb)
  );
end $$;
grant execute on function public.xem_lop(text, text) to anon, authenticated;
