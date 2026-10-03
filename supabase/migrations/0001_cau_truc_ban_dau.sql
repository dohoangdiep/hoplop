-- hoplop: cấu trúc dữ liệu ban đầu (Đợt 1)
-- Chạy trong Supabase → SQL Editor. Chạy một lần.

create extension if not exists pgcrypto;

-- ===== Quản trị hệ thống (chủ dịch vụ) =====
create table public.quan_tri_he_thong (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tao_luc timestamptz not null default now()
);

-- ===== Lớp =====
create table public.lop (
  id uuid primary key default gen_random_uuid(),
  ma text not null unique check (ma ~ '^[a-hjkmnp-z2-9]{6}$'),
  ten_goi text unique check (ten_goi is null or ten_goi ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  ten_lop text not null,
  truong text not null,
  tinh text,
  nien_khoa_bat_dau int,
  nien_khoa_ket_thuc int,
  giao_dien text not null default 'hoai-niem' check (giao_dien in ('hoai-niem','tuoi-sang','thanh-lich')),
  mat_khau_hash text,
  anh_bia_id uuid,
  cong_khai boolean not null default false,          -- chỉ dùng cho lớp mẫu
  trang_thai text not null default 'thu-tu-lieu'
    check (trang_thai in ('thu-tu-lieu','dang-dung','da-ban-giao','chi-xem','luu-tru')),
  het_han date,
  ghi_chu_noi_bo text,
  tao_luc timestamptz not null default now()
);

create table public.quan_tri_lop (
  lop_id uuid not null references public.lop(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vai text not null default 'duyet-anh' check (vai in ('chu','duyet-anh')),
  primary key (lop_id, user_id)
);

create table public.thanh_vien (
  id uuid primary key default gen_random_uuid(),
  lop_id uuid not null references public.lop(id) on delete cascade,
  ho_ten text not null,
  ten_goi_tat text,
  biet_danh text,
  noi_o text,
  cau_luu_but text,
  anh_xua_id uuid,
  anh_nay_id uuid,
  an_thong_tin boolean not null default false,
  thu_tu int not null default 0
);
create index on public.thanh_vien(lop_id);

create table public.so_do (
  lop_id uuid primary key references public.lop(id) on delete cascade,
  so_day int not null default 5,
  so_ban_moi_day int not null default 3,
  cho_moi_ban int not null default 2,
  bang_den_o text not null default 'tren' check (bang_den_o in ('tren','duoi'))
);

create table public.cho_ngoi (
  lop_id uuid not null references public.lop(id) on delete cascade,
  day int not null,
  ban int not null,
  vi_tri int not null,
  thanh_vien_id uuid references public.thanh_vien(id) on delete set null,
  primary key (lop_id, day, ban, vi_tri)
);

create table public.chuong (
  id uuid primary key default gen_random_uuid(),
  lop_id uuid not null references public.lop(id) on delete cascade,
  ma_qr text not null unique default encode(gen_random_bytes(9), 'hex'),
  tieu_de text not null,
  ngay date,
  dia_diem text,
  mo_ta text,
  anh_tap_the_id uuid,
  video_url text,
  qr_hieu_luc_tu timestamptz,
  qr_hieu_luc_den timestamptz,
  thu_tu int not null default 0
);
create index on public.chuong(lop_id);

create table public.anh (
  id uuid primary key default gen_random_uuid(),
  lop_id uuid not null references public.lop(id) on delete cascade,
  loai text not null check (loai in ('xua','chuong')),
  chuong_id uuid references public.chuong(id) on delete set null,
  muc text check (muc in ('lop-10','lop-11','lop-12','cam-trai','be-giang','khac')),
  nam_hoc text,
  chu_thich text,
  nguoi_gui_ten text,
  trang_thai text not null default 'cho-duyet' check (trang_thai in ('cho-duyet','da-duyet','an')),
  duong_dan_goc text,
  duong_dan_xem text,
  rong int,
  cao int,
  dung_luong bigint,
  tao_luc timestamptz not null default now()
);
create index on public.anh(lop_id, trang_thai);

create table public.anh_nguoi (
  anh_id uuid not null references public.anh(id) on delete cascade,
  thanh_vien_id uuid not null references public.thanh_vien(id) on delete cascade,
  primary key (anh_id, thanh_vien_id)
);

create table public.tai_hien (
  id uuid primary key default gen_random_uuid(),
  lop_id uuid not null references public.lop(id) on delete cascade,
  anh_xua_id uuid references public.anh(id) on delete set null,
  anh_nay_id uuid references public.anh(id) on delete set null,
  chu_thich text
);

create table public.thu_hen_gio (
  id uuid primary key default gen_random_uuid(),
  lop_id uuid not null references public.lop(id) on delete cascade,
  nguoi_viet text,
  noi_dung text not null,
  mo_vao_chuong_id uuid references public.chuong(id) on delete set null,
  mo_vao_ngay date,
  da_mo boolean not null default false,
  tao_luc timestamptz not null default now()
);

create table public.thay_co (
  id uuid primary key default gen_random_uuid(),
  lop_id uuid not null references public.lop(id) on delete cascade,
  ho_ten text not null,
  vai_tro text,
  mon text,
  cau_noi text,
  anh_id uuid
);

create table public.ten_mien (
  hostname text primary key,
  lop_id uuid not null references public.lop(id) on delete cascade,
  het_han date
);

-- ===== Hàm kiểm tra quyền =====
create or replace function public.la_quan_tri_he_thong() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from quan_tri_he_thong where user_id = auth.uid());
$$;

create or replace function public.quan_tri_duoc_lop(p_lop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select la_quan_tri_he_thong()
      or exists (select 1 from quan_tri_lop where lop_id = p_lop and user_id = auth.uid());
$$;

-- ===== RLS =====
-- Thành viên (không tài khoản) KHÔNG đọc bảng trực tiếp; họ đi qua Edge Function `vao-lop`.
-- Chính sách dưới đây chỉ cho quản trị.
do $$
declare t text;
begin
  foreach t in array array['lop','quan_tri_lop','thanh_vien','so_do','cho_ngoi','chuong','anh',
                           'anh_nguoi','tai_hien','thu_hen_gio','thay_co','ten_mien','quan_tri_he_thong']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "qtht toàn quyền" on public.quan_tri_he_thong for all using (la_quan_tri_he_thong()) with check (la_quan_tri_he_thong());

create policy "quản trị xem lớp" on public.lop for select using (quan_tri_duoc_lop(id));
create policy "qtht tạo lớp" on public.lop for insert with check (la_quan_tri_he_thong());
create policy "quản trị sửa lớp" on public.lop for update using (quan_tri_duoc_lop(id)) with check (quan_tri_duoc_lop(id));
create policy "qtht xóa lớp" on public.lop for delete using (la_quan_tri_he_thong());

create policy "quản trị xem qtl" on public.quan_tri_lop for select using (quan_tri_duoc_lop(lop_id));
create policy "qtht sửa qtl" on public.quan_tri_lop for all using (la_quan_tri_he_thong()) with check (la_quan_tri_he_thong());

do $$
declare t text;
begin
  foreach t in array array['thanh_vien','so_do','cho_ngoi','chuong','anh','tai_hien','thu_hen_gio','thay_co','ten_mien']
  loop
    execute format(
      'create policy "quản trị lớp toàn quyền" on public.%I for all using (quan_tri_duoc_lop(lop_id)) with check (quan_tri_duoc_lop(lop_id))', t);
  end loop;
end $$;

create policy "quản trị gắn người" on public.anh_nguoi for all
  using (exists (select 1 from anh a where a.id = anh_id and quan_tri_duoc_lop(a.lop_id)))
  with check (exists (select 1 from anh a where a.id = anh_id and quan_tri_duoc_lop(a.lop_id)));

-- ===== Tìm lớp công khai tối thiểu (để hiện màn hình nhập mật khẩu) =====
-- Chỉ trả về tên lớp, trường, niên khóa, giao diện. Không bao giờ trả mat_khau_hash.
create or replace function public.tim_lop_cong_khai(p_khoa text)
returns table (id uuid, ma text, ten_goi text, ten_lop text, truong text, tinh text,
               nien_khoa_bat_dau int, nien_khoa_ket_thuc int, giao_dien text, cong_khai boolean)
language sql stable security definer set search_path = public as $$
  select l.id, l.ma, l.ten_goi, l.ten_lop, l.truong, l.tinh, l.nien_khoa_bat_dau, l.nien_khoa_ket_thuc, l.giao_dien, l.cong_khai
  from lop l
  where (l.ma = lower(p_khoa) or l.ten_goi = lower(p_khoa))
    and l.trang_thai <> 'luu-tru'
  order by (l.ma = lower(p_khoa)) desc
  limit 1;
$$;
grant execute on function public.tim_lop_cong_khai(text) to anon, authenticated;

-- Đặt mật khẩu lớp (quản trị gọi). Lưu dạng bcrypt.
create or replace function public.dat_mat_khau_lop(p_lop uuid, p_mat_khau text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not quan_tri_duoc_lop(p_lop) then raise exception 'Không có quyền'; end if;
  update lop set mat_khau_hash = crypt(p_mat_khau, gen_salt('bf')) where id = p_lop;
end $$;
grant execute on function public.dat_mat_khau_lop(uuid, text) to authenticated;

-- ===== Kho ảnh (riêng tư) =====
insert into storage.buckets (id, name, public) values ('anh', 'anh', false)
on conflict (id) do nothing;

-- Quản trị đọc/ghi ảnh của lớp mình: đường dẫn lop/{lop_id}/...
create policy "quản trị ảnh lớp" on storage.objects for all
  using (bucket_id = 'anh' and quan_tri_duoc_lop(((storage.foldername(name))[2])::uuid))
  with check (bucket_id = 'anh' and quan_tri_duoc_lop(((storage.foldername(name))[2])::uuid));
