-- hoplop: gửi ảnh, duyệt ảnh, xem ảnh
-- Chạy trong Supabase → SQL Editor sau file 0002.

alter table public.anh add column if not exists da_tai_xong boolean not null default false;
alter table public.anh add column if not exists kieu_goc text;   -- đuôi file gốc: jpg, png, heic...

-- ===== Tạo lượt gửi ảnh =====
-- Thành viên gọi sau khi có mật khẩu lớp (hoặc mã QR chương). Trả về danh sách id ảnh được phép tải lên.
create or replace function public.tao_luot_gui(
  p_khoa text,
  p_so_anh int,
  p_mat_khau text default null,
  p_ma_qr text default null,
  p_muc text default null,
  p_chu_thich text default null,
  p_nguoi_gui text default null,
  p_kieu_goc text[] default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  l lop%rowtype;
  c chuong%rowtype;
  v_loai text := 'xua';
  v_ids jsonb := '[]'::jsonb;
  v_id uuid;
  i int;
  so_gan_day int;
begin
  if p_so_anh < 1 or p_so_anh > 20 then return jsonb_build_object('loi', 'so-anh'); end if;

  select * into l from lop where (ma = lower(p_khoa) or ten_goi = lower(p_khoa)) and trang_thai not in ('chi-xem','luu-tru')
  order by (ma = lower(p_khoa)) desc limit 1;
  if not found then return jsonb_build_object('loi', 'khong-tim-thay'); end if;

  if p_ma_qr is not null then
    select * into c from chuong where lop_id = l.id and ma_qr = p_ma_qr;
    if not found then return jsonb_build_object('loi', 'qr-sai'); end if;
    if (c.qr_hieu_luc_tu is not null and now() < c.qr_hieu_luc_tu)
       or (c.qr_hieu_luc_den is not null and now() > c.qr_hieu_luc_den) then
      return jsonb_build_object('loi', 'qr-het-han');
    end if;
    v_loai := 'chuong';
  elsif not quan_tri_duoc_lop(l.id) then
    if p_mat_khau is null or l.mat_khau_hash is null or l.mat_khau_hash <> crypt(p_mat_khau, l.mat_khau_hash) then
      return jsonb_build_object('loi', 'can-mat-khau');
    end if;
  end if;

  -- Chặn gửi ồ ạt: tối đa 300 ảnh mỗi giờ mỗi lớp
  select count(*) into so_gan_day from anh where lop_id = l.id and tao_luc > now() - interval '1 hour';
  if so_gan_day + p_so_anh > 300 then return jsonb_build_object('loi', 'qua-nhieu'); end if;

  for i in 1..p_so_anh loop
    v_id := gen_random_uuid();
    insert into anh (id, lop_id, loai, chuong_id, muc, chu_thich, nguoi_gui_ten, trang_thai, kieu_goc,
                     duong_dan_xem, duong_dan_goc)
    values (v_id, l.id, v_loai, c.id,
            case when v_loai = 'xua' then coalesce(p_muc, 'khac') else null end,
            nullif(trim(p_chu_thich), ''), nullif(trim(p_nguoi_gui), ''),
            case when quan_tri_duoc_lop(l.id) then 'da-duyet' else 'cho-duyet' end,
            coalesce(p_kieu_goc[i], 'jpg'),
            format('lop/%s/%s/%s/xem.jpg', l.id, v_loai, v_id),
            format('lop/%s/%s/%s/goc.%s', l.id, v_loai, v_id, coalesce(p_kieu_goc[i], 'jpg')));
    v_ids := v_ids || jsonb_build_object('id', v_id, 'xem', format('lop/%s/%s/%s/xem.jpg', l.id, v_loai, v_id),
                                         'goc', format('lop/%s/%s/%s/goc.%s', l.id, v_loai, v_id, coalesce(p_kieu_goc[i], 'jpg')));
  end loop;
  return jsonb_build_object('anh', v_ids);
end $$;
grant execute on function public.tao_luot_gui(text, int, text, text, text, text, text, text[]) to anon, authenticated;

-- Đánh dấu đã tải xong (chỉ trong 2 giờ sau khi tạo lượt)
create or replace function public.xong_tai_anh(p_anh_id uuid, p_rong int, p_cao int, p_dung_luong bigint)
returns void language sql security definer set search_path = public as $$
  update anh set da_tai_xong = true, rong = p_rong, cao = p_cao, dung_luong = p_dung_luong
  where id = p_anh_id and not da_tai_xong and tao_luc > now() - interval '2 hours';
$$;
grant execute on function public.xong_tai_anh(uuid, int, int, bigint) to anon, authenticated;

-- ===== Quyền trên kho ảnh =====
-- Được TẢI LÊN một file nếu đường dẫn khớp đúng một lượt gửi còn hạn, chưa xong.
create or replace function public.cho_phep_tai_anh(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return exists (
    select 1 from anh a
    where (a.duong_dan_xem = p_name or a.duong_dan_goc = p_name)
      and not a.da_tai_xong
      and a.tao_luc > now() - interval '2 hours'
  );
end $$;

-- Được XEM (ký link) bản xem của ảnh đã duyệt. Đường dẫn chứa uuid ngẫu nhiên, chỉ lộ ra sau khi vào lớp.
create or replace function public.cho_phep_xem_anh(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from anh a where a.duong_dan_xem = p_name and a.trang_thai = 'da-duyet' and a.da_tai_xong);
$$;

create policy "tải ảnh theo lượt gửi" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'anh' and cho_phep_tai_anh(name));

create policy "xem ảnh đã duyệt" on storage.objects for select to anon, authenticated
  using (bucket_id = 'anh' and cho_phep_xem_anh(name));

-- ===== xem_lop: thêm ảnh =====
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
      select jsonb_agg(jsonb_build_object('id', c.id, 'tieu_de', c.tieu_de, 'ngay', c.ngay, 'dia_diem', c.dia_diem)
                       order by c.ngay desc nulls last)
      from chuong c where c.lop_id = l.id), '[]'::jsonb),
    'anh', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'loai', a.loai, 'muc', a.muc, 'chuong_id', a.chuong_id,
                                          'chu_thich', a.chu_thich, 'xem', a.duong_dan_xem) order by a.tao_luc)
      from anh a where a.lop_id = l.id and a.trang_thai = 'da-duyet' and a.da_tai_xong), '[]'::jsonb)
  );
end $$;
grant execute on function public.xem_lop(text, text) to anon, authenticated;
