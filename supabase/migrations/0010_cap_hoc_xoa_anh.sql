-- hoplop: cấp học của lớp (mục ảnh xưa theo cấp), lớp trưởng xóa hẳn ảnh
-- Chạy trong Supabase → SQL Editor sau file 0009. Chạy một lần.
--   * lop.cap: 'tieu-hoc' (Lớp 1–5) | 'thcs' (Lớp 6–9) | 'thpt' (Lớp 10–12, mặc định) | 'dai-hoc' (Năm 1–4)
--   * Mục ảnh xưa hợp lệ tùy cấp (muc_cua_cap); xem_lop, thong_tin_gui_anh, lt_du_lieu trả thêm 'cap'
--   * lt_xoa_anh: lớp trưởng xóa hẳn ảnh; file trên kho vào hàng đợi, trang quản trị tự dọn

alter table public.lop add column if not exists cap text not null default 'thpt'
  check (cap in ('tieu-hoc', 'thcs', 'thpt', 'dai-hoc'));

alter table public.anh drop constraint if exists anh_muc_check;
alter table public.anh add constraint anh_muc_check
  check (muc is null or muc ~ '^(lop-([1-9]|1[0-2])|nam-[1-6]|cam-trai|be-giang|khac|chan-dung)$');

-- Các mục ảnh xưa của một cấp học (không gồm 'chan-dung' là ảnh riêng)
create or replace function public.muc_cua_cap(p_cap text) returns text[]
language sql immutable as $$
  select (case p_cap
    when 'tieu-hoc' then array['lop-1','lop-2','lop-3','lop-4','lop-5']
    when 'thcs'     then array['lop-6','lop-7','lop-8','lop-9']
    when 'dai-hoc'  then array['nam-1','nam-2','nam-3','nam-4']
    else                 array['lop-10','lop-11','lop-12'] end)
    || array['cam-trai','be-giang','khac'];
$$;

-- ===== Các hàm cũ, định nghĩa lại để biết cấp học (giữ nguyên phần còn lại như 0006) =====

create or replace function public.xem_lop(p_khoa text, p_mat_khau text default null, p_token text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  l lop%rowtype;
  v_khoa text := lower(trim(coalesce(p_khoa, '')));
  v_vai text;
begin
  select * into l from lop
  where (ma = v_khoa or ten_goi = v_khoa) and trang_thai <> 'luu-tru'
  order by (ma = v_khoa) desc limit 1;
  if not found then return jsonb_build_object('loi', 'khong-tim-thay'); end if;

  v_vai := quyen_vao_lop(l.id, l.ma <> v_khoa, p_mat_khau, p_token);
  if v_vai = 'tam-khoa' then return jsonb_build_object('loi', 'tam-khoa'); end if;
  if v_vai = 'can-mat-khau' then
    return jsonb_build_object('loi', 'can-mat-khau',
      'lop', jsonb_build_object('ma', l.ma, 'ten_lop', l.ten_lop, 'truong', l.truong, 'giao_dien', l.giao_dien,
                                'nien_khoa_bat_dau', l.nien_khoa_bat_dau, 'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc));
  end if;

  return jsonb_build_object(
    'vai', v_vai,
    'so_cho_duyet', case when v_vai in ('quan-tri', 'lop-truong')
      then (select count(*) from anh a where a.lop_id = l.id and a.trang_thai = 'cho-duyet' and a.da_tai_xong) end,
    'lop', jsonb_build_object(
      'id', l.id, 'ma', l.ma, 'ten_goi', l.ten_goi, 'ten_lop', l.ten_lop, 'truong', l.truong, 'tinh', l.tinh,
      'nien_khoa_bat_dau', l.nien_khoa_bat_dau, 'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc,
      'giao_dien', l.giao_dien, 'trang_thai', l.trang_thai, 'cap', l.cap,
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
grant execute on function public.xem_lop(text, text, text) to anon, authenticated;

create or replace function public.thong_tin_gui_anh(p_khoa text, p_mat_khau text default null,
                                                    p_ma_qr text default null, p_token text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  l lop%rowtype;
  v_khoa text := lower(trim(coalesce(p_khoa, '')));
  v_chon uuid;
  v_vai text;
begin
  select * into l from lop
  where (ma = v_khoa or ten_goi = v_khoa) and trang_thai <> 'luu-tru'
  order by (ma = v_khoa) desc limit 1;
  if not found then return jsonb_build_object('loi', 'khong-tim-thay'); end if;

  if p_ma_qr is not null then
    select c.id into v_chon from chuong c where c.lop_id = l.id and c.ma_qr = p_ma_qr;
  end if;

  v_vai := quyen_vao_lop(l.id, l.ma <> v_khoa, case when v_chon is null then p_mat_khau end, p_token);
  if v_vai in ('can-mat-khau', 'tam-khoa') then
    if v_chon is null then
      return jsonb_build_object('loi', v_vai,
        'lop', jsonb_build_object('ma', l.ma, 'ten_lop', l.ten_lop, 'truong', l.truong, 'giao_dien', l.giao_dien,
                                  'nien_khoa_bat_dau', l.nien_khoa_bat_dau, 'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc));
    end if;
    v_vai := 'thanh-vien';
  end if;

  return jsonb_build_object(
    'vai', v_vai,
    'nhan_anh', l.trang_thai not in ('chi-xem', 'luu-tru'),
    'chon_chuong_id', v_chon,
    'ma_qr_sai', p_ma_qr is not null and v_chon is null,
    'ho_ten', case when v_vai = 'lop-truong'
      then (select lt.ho_ten from lop_truong lt where lt.lop_id = l.id and lt.sdt = sdt_tu_phien(p_token) limit 1) end,
    'lop', jsonb_build_object('ma', l.ma, 'ten_lop', l.ten_lop, 'truong', l.truong, 'giao_dien', l.giao_dien, 'cap', l.cap,
                              'nien_khoa_bat_dau', l.nien_khoa_bat_dau, 'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc),
    'chuong', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'tieu_de', c.tieu_de, 'ngay', c.ngay, 'dia_diem', c.dia_diem)
                       order by c.ngay desc nulls last, c.thu_tu desc)
      from chuong c where c.lop_id = l.id), '[]'::jsonb));
end $$;
grant execute on function public.thong_tin_gui_anh(text, text, text, text) to anon, authenticated;

create or replace function public.tao_luot_gui(
  p_khoa text,
  p_so_anh int,
  p_mat_khau text default null,
  p_ma_qr text default null,
  p_chuong_id uuid default null,
  p_muc text default null,
  p_chu_thich text default null,
  p_nguoi_gui text default null,
  p_kieu_goc text[] default null,
  p_token text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  l lop%rowtype;
  v_khoa text := lower(trim(coalesce(p_khoa, '')));
  v_vai text;
  v_qr_dung boolean := false;
  v_loai text;
  v_muc text;
  v_duyet boolean;
  v_ids jsonb := '[]'::jsonb;
  v_id uuid;
  v_duoi text;
  v_xem text;
  v_goc text;
  i int;
  so_gan_day int;
begin
  if p_so_anh is null or p_so_anh < 1 or p_so_anh > 20 then return jsonb_build_object('loi', 'so-anh'); end if;

  select * into l from lop
  where (ma = v_khoa or ten_goi = v_khoa) and trang_thai <> 'luu-tru'
  order by (ma = v_khoa) desc limit 1;
  if not found then return jsonb_build_object('loi', 'khong-tim-thay'); end if;
  if l.trang_thai = 'chi-xem' then return jsonb_build_object('loi', 'chi-xem'); end if;

  if p_ma_qr is not null then
    v_qr_dung := exists (select 1 from chuong c where c.lop_id = l.id and c.ma_qr = p_ma_qr);
  end if;
  v_vai := quyen_vao_lop(l.id, l.ma <> v_khoa, case when v_qr_dung then null else p_mat_khau end, p_token);
  if v_vai in ('can-mat-khau', 'tam-khoa') then
    if not v_qr_dung then return jsonb_build_object('loi', v_vai); end if;
    v_vai := 'thanh-vien';
  end if;
  v_duyet := v_vai in ('quan-tri', 'lop-truong');

  if p_chuong_id is not null then
    if not exists (select 1 from chuong c where c.id = p_chuong_id and c.lop_id = l.id) then
      return jsonb_build_object('loi', 'buoi-sai');
    end if;
    v_loai := 'chuong';
    v_muc := null;
  else
    v_loai := 'xua';
    v_muc := case
      when p_muc = any(muc_cua_cap(l.cap)) then p_muc
      when p_muc = 'chan-dung' and v_vai = 'quan-tri' then p_muc
      when p_muc is null then null           -- "không nhớ rõ": lớp trưởng xếp sau
      else 'khac' end;
  end if;

  -- Chặn gửi ồ ạt: tối đa 300 ảnh mỗi giờ mỗi lớp (trừ quản trị)
  if v_vai <> 'quan-tri' then
    select count(*) into so_gan_day from anh where lop_id = l.id and tao_luc > now() - interval '1 hour';
    if so_gan_day + p_so_anh > 300 then return jsonb_build_object('loi', 'qua-nhieu'); end if;
  end if;

  for i in 1..p_so_anh loop
    v_id := gen_random_uuid();
    v_duoi := coalesce(p_kieu_goc[i], 'jpg');
    if v_duoi !~ '^[a-z0-9]{2,5}$' then v_duoi := 'jpg'; end if;
    v_xem := format('lop/%s/%s/%s/xem.jpg', l.id, v_loai, v_id);
    v_goc := format('lop/%s/%s/%s/goc.%s', l.id, v_loai, v_id, v_duoi);
    insert into anh (id, lop_id, loai, chuong_id, muc, chu_thich, nguoi_gui_ten, trang_thai, kieu_goc,
                     duong_dan_xem, duong_dan_goc)
    values (v_id, l.id, v_loai, case when v_loai = 'chuong' then p_chuong_id end, v_muc,
            nullif(trim(p_chu_thich), ''), nullif(trim(p_nguoi_gui), ''),
            case when v_duyet then 'da-duyet' else 'cho-duyet' end,
            v_duoi, v_xem, v_goc);
    v_ids := v_ids || jsonb_build_object('id', v_id, 'xem', v_xem, 'goc', v_goc);
  end loop;
  return jsonb_build_object('anh', v_ids, 'da_duyet', v_duyet);
end $$;
grant execute on function public.tao_luot_gui(text, int, text, text, uuid, text, text, text, text[], text) to anon, authenticated;

create or replace function public.lt_du_lieu(p_token text, p_lop uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare l lop%rowtype;
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  select * into l from lop where id = p_lop;
  return jsonb_build_object(
    'lop', jsonb_build_object('id', l.id, 'ma', l.ma, 'ten_lop', l.ten_lop, 'truong', l.truong, 'giao_dien', l.giao_dien,
                              'nien_khoa_bat_dau', l.nien_khoa_bat_dau, 'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc,
                              'trang_thai', l.trang_thai, 'cap', l.cap),
    'ho_ten', (select lt.ho_ten from lop_truong lt where lt.lop_id = l.id and lt.sdt = sdt_tu_phien(p_token) limit 1),
    'chuong', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'ma_qr', c.ma_qr, 'tieu_de', c.tieu_de, 'ngay', c.ngay,
                       'dia_diem', c.dia_diem, 'mo_ta', c.mo_ta, 'video_url', c.video_url,
                       'anh_tap_the_id', c.anh_tap_the_id,
                       'so_anh', (select count(*) from anh a where a.chuong_id = c.id and a.da_tai_xong))
                       order by c.ngay desc nulls first, c.thu_tu desc)
      from chuong c where c.lop_id = l.id), '[]'::jsonb),
    'anh', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'loai', a.loai, 'chuong_id', a.chuong_id, 'muc', a.muc,
                       'chu_thich', a.chu_thich, 'nguoi_gui_ten', a.nguoi_gui_ten, 'trang_thai', a.trang_thai,
                       'xem', a.duong_dan_xem, 'tao_luc', a.tao_luc) order by a.tao_luc desc)
      from anh a where a.lop_id = l.id and a.da_tai_xong and coalesce(a.muc, '') <> 'chan-dung'), '[]'::jsonb));
end $$;

create or replace function public.lt_xep_anh(p_token text, p_lop uuid, p_ids uuid[], p_chuong_id uuid, p_muc text)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare n int;
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  if p_chuong_id is not null then
    if not exists (select 1 from chuong c where c.id = p_chuong_id and c.lop_id = p_lop) then
      return jsonb_build_object('loi', 'buoi-sai');
    end if;
    update anh set loai = 'chuong', chuong_id = p_chuong_id, muc = null
    where lop_id = p_lop and id = any(p_ids) and coalesce(muc, '') <> 'chan-dung';
  else
    if p_muc is not null and not (p_muc = any(muc_cua_cap((select cap from lop where id = p_lop)))) then
      return jsonb_build_object('loi', 'muc-sai');
    end if;
    update anh set loai = 'xua', chuong_id = null, muc = p_muc
    where lop_id = p_lop and id = any(p_ids) and coalesce(muc, '') <> 'chan-dung';
  end if;
  get diagnostics n = row_count;
  return jsonb_build_object('so_anh', n);
end $$;

create or replace function public.qt_ds_lop()
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not la_quan_tri_he_thong() then raise exception 'Không có quyền'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', l.id, 'ma', l.ma, 'ten_goi', l.ten_goi, 'ten_lop', l.ten_lop, 'truong', l.truong, 'tinh', l.tinh,
      'nien_khoa_bat_dau', l.nien_khoa_bat_dau, 'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc,
      'giao_dien', l.giao_dien, 'trang_thai', l.trang_thai, 'het_han', l.het_han, 'tao_luc', l.tao_luc,
      'luon_can_mat_khau', l.luon_can_mat_khau, 'cap', l.cap,
      'lop_truong', coalesce((select jsonb_agg(jsonb_build_object('id', lt.id, 'ho_ten', lt.ho_ten, 'sdt', lt.sdt) order by lt.tao_luc)
                              from lop_truong lt where lt.lop_id = l.id), '[]'::jsonb),
      'so_cho_duyet', (select count(*) from anh a where a.lop_id = l.id and a.trang_thai = 'cho-duyet' and a.da_tai_xong)
    ) order by l.tao_luc desc)
    from lop l), '[]'::jsonb);
end $$;

-- ===== Lớp trưởng xóa hẳn ảnh =====
-- Lớp trưởng không có quyền xóa file trên kho: đường dẫn file vào hàng đợi,
-- trang quản trị (đăng nhập email, có quyền kho) tự dọn mỗi lần mở danh sách lớp.
create table if not exists public.file_cho_xoa (
  duong_dan text primary key,
  tao_luc timestamptz not null default now()
);
alter table public.file_cho_xoa enable row level security;
drop policy if exists "qtht dọn file" on public.file_cho_xoa;
create policy "qtht dọn file" on public.file_cho_xoa for all using (la_quan_tri_he_thong()) with check (la_quan_tri_he_thong());

create or replace function public.lt_xoa_anh(p_token text, p_lop uuid, p_ids uuid[])
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare n int;
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 or array_length(p_ids, 1) > 200 then return jsonb_build_object('loi', 'so-anh'); end if;

  -- Gỡ mọi chỗ đang trỏ tới các ảnh này
  update lop set anh_bia_id = null where id = p_lop and anh_bia_id = any(p_ids);
  update thanh_vien set anh_xua_id = null where lop_id = p_lop and anh_xua_id = any(p_ids);
  update thanh_vien set anh_nay_id = null where lop_id = p_lop and anh_nay_id = any(p_ids);
  update chuong set anh_tap_the_id = null where lop_id = p_lop and anh_tap_the_id = any(p_ids);
  update thay_co set anh_id = null where lop_id = p_lop and anh_id = any(p_ids);
  delete from tai_hien where lop_id = p_lop and (anh_xua_id = any(p_ids) or anh_nay_id = any(p_ids));

  insert into file_cho_xoa (duong_dan)
  select d from anh a, unnest(array[a.duong_dan_xem, a.duong_dan_goc]) d
  where a.lop_id = p_lop and a.id = any(p_ids) and d is not null
  on conflict do nothing;

  delete from anh where lop_id = p_lop and id = any(p_ids);
  get diagnostics n = row_count;
  return jsonb_build_object('so_anh', n);
end $$;
grant execute on function public.lt_xoa_anh(text, uuid, uuid[]) to anon, authenticated;
