-- hoplop: vai trò đã chốt 06/10/2026 (Đợt 1b)
--   * Thành viên vào lớp bằng mã lớp, không cần mật khẩu.
--     Vào bằng tên gọi, hoặc lớp bật "Luôn cần mật khẩu", mới hỏi mật khẩu.
--   * Lớp trưởng (tối đa 2/lớp) đăng nhập bằng SĐT + PIN 6 số; duyệt ảnh, xếp ảnh, tạo buổi họp.
--   * Một trang gửi ảnh chung: chọn "ảnh chụp hồi nào" (mục ảnh xưa hoặc một buổi họp).
--     Ảnh thành viên chờ duyệt; ảnh lớp trưởng và chủ dịch vụ hiện ngay. QR không còn hạn.
-- Chạy trong Supabase → SQL Editor sau file 0005. Chạy một lần.

create extension if not exists pgcrypto;

-- ============================================================
-- 1. Lớp: công tắc "Luôn cần mật khẩu"
-- ============================================================
alter table public.lop add column if not exists luon_can_mat_khau boolean not null default false;

-- ============================================================
-- 2. Số điện thoại: chuẩn hóa về dạng 0xxxxxxxxx
--    "+84 912 345 678", "84912345678", "0912.345.678", "912345678" -> "0912345678"
-- ============================================================
create or replace function public.chuan_hoa_sdt(p text) returns text
language sql immutable as $$
  select case
    when d ~ '^84[1-9][0-9]{8}$' then '0' || substr(d, 3)
    when d ~ '^[1-9][0-9]{8}$' then '0' || d
    else d end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) x;
$$;

-- ============================================================
-- 3. Lớp trưởng, phiên đăng nhập, lần nhập sai PIN
--    Không có policy nào: chỉ các hàm security definer bên dưới được đọc/ghi.
-- ============================================================
create table if not exists public.lop_truong (
  id uuid primary key default gen_random_uuid(),
  lop_id uuid not null references public.lop(id) on delete cascade,
  ho_ten text not null,
  sdt text not null check (sdt ~ '^0[0-9]{9}$'),
  pin_hash text not null,
  tao_luc timestamptz not null default now(),
  unique (lop_id, sdt)
);
create index if not exists lop_truong_sdt on public.lop_truong(sdt);
alter table public.lop_truong enable row level security;

create or replace function public.gioi_han_lop_truong() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.lop_truong where lop_id = new.lop_id) >= 2 then
    raise exception 'Mỗi lớp tối đa 2 lớp trưởng';
  end if;
  return new;
end $$;
drop trigger if exists gioi_han_lop_truong on public.lop_truong;
create trigger gioi_han_lop_truong before insert on public.lop_truong
  for each row execute function public.gioi_han_lop_truong();

-- Đăng nhập một lần, máy nhớ: trình duyệt giữ token ngẫu nhiên, ở đây chỉ lưu mã băm.
-- Phiên gắn với SĐT nên dùng được cho mọi lớp SĐT đó làm lớp trưởng.
-- Tạo PIN mới thì mọi phiên của SĐT đó bị đăng xuất.
create table if not exists public.phien_lop_truong (
  token_hash text primary key,
  sdt text not null,
  tao_luc timestamptz not null default now(),
  het_han timestamptz not null default now() + interval '180 days'
);
create index if not exists phien_lop_truong_sdt on public.phien_lop_truong(sdt);
alter table public.phien_lop_truong enable row level security;

create table if not exists public.lan_sai_pin (
  id bigserial primary key,
  sdt text not null,
  luc timestamptz not null default now()
);
create index if not exists lan_sai_pin_sdt_luc on public.lan_sai_pin(sdt, luc);
alter table public.lan_sai_pin enable row level security;

-- PIN 6 số ngẫu nhiên (dùng bộ sinh số ngẫu nhiên mật mã)
create or replace function public.tao_pin() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare b bytea := gen_random_bytes(4);
begin
  return lpad((((get_byte(b,0)::bigint << 24) | (get_byte(b,1) << 16) | (get_byte(b,2) << 8) | get_byte(b,3)) % 1000000)::text, 6, '0');
end $$;

-- Token -> SĐT (null nếu sai hoặc hết hạn)
create or replace function public.sdt_tu_phien(p_token text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select p.sdt from phien_lop_truong p
  where p_token is not null and length(p_token) between 32 and 128
    and p.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and p.het_han > now();
$$;

create or replace function public.la_lop_truong(p_token text, p_lop uuid) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from lop_truong lt where lt.lop_id = p_lop and lt.sdt = sdt_tu_phien(p_token));
$$;

-- ============================================================
-- 4. Quyền vào một lớp (dùng chung cho xem lớp và gửi ảnh)
--    Trả về: 'quan-tri' | 'lop-truong' | 'thanh-vien' | 'can-mat-khau' | 'tam-khoa'
-- ============================================================
create or replace function public.quyen_vao_lop(p_lop uuid, p_qua_ten_goi boolean, p_mat_khau text, p_token text)
returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  l lop%rowtype;
  so_lan_sai int;
begin
  select * into l from lop where id = p_lop;
  if not found then return 'can-mat-khau'; end if;
  if quan_tri_duoc_lop(l.id) then return 'quan-tri'; end if;
  if la_lop_truong(p_token, l.id) then return 'lop-truong'; end if;
  if l.cong_khai or (not p_qua_ten_goi and not l.luon_can_mat_khau) then return 'thanh-vien'; end if;

  select count(*) into so_lan_sai from lan_nhap_sai where lop_id = l.id and luc > now() - interval '10 minutes';
  if so_lan_sai >= 10 then return 'tam-khoa'; end if;
  if p_mat_khau is not null and l.mat_khau_hash is not null and l.mat_khau_hash = crypt(p_mat_khau, l.mat_khau_hash) then
    return 'thanh-vien';
  end if;
  if p_mat_khau is not null then insert into lan_nhap_sai(lop_id) values (l.id); end if;
  return 'can-mat-khau';
end $$;

-- Các hàm nội bộ: không cho gọi trực tiếp từ trình duyệt
revoke execute on function public.tao_pin() from public, anon, authenticated;
revoke execute on function public.sdt_tu_phien(text) from public, anon, authenticated;
revoke execute on function public.la_lop_truong(text, uuid) from public, anon, authenticated;
revoke execute on function public.quyen_vao_lop(uuid, boolean, text, text) from public, anon, authenticated;

-- ============================================================
-- 5. Xem trang lớp
-- ============================================================
drop function if exists public.xem_lop(text, text);
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
grant execute on function public.xem_lop(text, text, text) to anon, authenticated;

-- ============================================================
-- 6. Trang gửi ảnh chung
-- ============================================================
-- Thông tin để dựng trang gửi ảnh: tên lớp, danh sách buổi họp để chọn "chụp hồi nào".
-- p_ma_qr (từ QR buổi họp) chọn sẵn buổi đó, và đủ để vào trang gửi ảnh kể cả khi lớp cần mật khẩu.
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
    'lop', jsonb_build_object('ma', l.ma, 'ten_lop', l.ten_lop, 'truong', l.truong, 'giao_dien', l.giao_dien,
                              'nien_khoa_bat_dau', l.nien_khoa_bat_dau, 'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc),
    'chuong', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'tieu_de', c.tieu_de, 'ngay', c.ngay, 'dia_diem', c.dia_diem)
                       order by c.ngay desc nulls last, c.thu_tu desc)
      from chuong c where c.lop_id = l.id), '[]'::jsonb));
end $$;
grant execute on function public.thong_tin_gui_anh(text, text, text, text) to anon, authenticated;

-- Tạo lượt gửi ảnh. Ảnh vào kho ảnh xưa (p_muc; null = "không nhớ rõ") hoặc vào một buổi họp (p_chuong_id).
drop function if exists public.tao_luot_gui(text, int, text, text, text, text, text, text[]);
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
      when p_muc in ('lop-10','lop-11','lop-12','cam-trai','be-giang','khac') then p_muc
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

-- Người gửi xem lại ảnh mình đã gửi (máy lưu id ảnh): đang chờ, đã lên trang, hay không được đưa lên.
create or replace function public.tinh_trang_anh(p_ids uuid[])
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'trang_thai', a.trang_thai,
                    'xem', case when a.trang_thai <> 'an' then a.duong_dan_xem end) order by a.tao_luc desc), '[]'::jsonb)
  from anh a
  where a.id = any(p_ids[1:100]) and a.da_tai_xong;
$$;
grant execute on function public.tinh_trang_anh(uuid[]) to anon, authenticated;

-- QR buổi họp không còn hết hạn: cột qr_hieu_luc_tu/den để lại nhưng không dùng nữa.

-- ============================================================
-- 7. Quyền xem ảnh trên kho
--    Ảnh chờ duyệt cũng ký link được, vì đường dẫn (chứa uuid ngẫu nhiên) chỉ lộ ra cho
--    người gửi, lớp trưởng và chủ dịch vụ. Ảnh đã ẩn: chỉ lớp trưởng (gửi token qua header) và quản trị.
-- ============================================================
create or replace function public.cho_phep_xem_anh(p_name text) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  a anh%rowtype;
  v_token text;
begin
  select * into a from anh where duong_dan_xem = p_name and da_tai_xong;
  if not found then return false; end if;
  if a.trang_thai in ('da-duyet', 'cho-duyet') then return true; end if;
  begin
    v_token := nullif(current_setting('request.headers', true), '')::json ->> 'x-hoplop-lt';
  exception when others then v_token := null;
  end;
  return la_lop_truong(v_token, a.lop_id);
end $$;
grant execute on function public.cho_phep_xem_anh(text) to anon, authenticated;

-- ============================================================
-- 8. Lớp trưởng: đăng nhập, danh sách lớp, đăng xuất
-- ============================================================
create or replace function public.dang_nhap_lop_truong(p_sdt text, p_pin text)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_sdt text := chuan_hoa_sdt(p_sdt);
  v_sai int;
  v_dung boolean;
  v_token text;
begin
  if v_sdt !~ '^0[0-9]{9}$' then return jsonb_build_object('loi', 'sdt'); end if;
  delete from lan_sai_pin where luc < now() - interval '1 day';
  delete from phien_lop_truong where het_han < now();

  select count(*) into v_sai from lan_sai_pin where sdt = v_sdt and luc > now() - interval '15 minutes';
  if v_sai >= 5 then return jsonb_build_object('loi', 'tam-khoa'); end if;

  select exists (
    select 1 from lop_truong lt
    where lt.sdt = v_sdt and coalesce(p_pin, '') ~ '^[0-9]{6}$' and lt.pin_hash = crypt(p_pin, lt.pin_hash)
  ) into v_dung;
  if not v_dung then
    insert into lan_sai_pin(sdt) values (v_sdt);
    return jsonb_build_object('loi', 'sai', 'con_lai', greatest(0, 4 - v_sai));
  end if;

  delete from lan_sai_pin where sdt = v_sdt;
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into phien_lop_truong(token_hash, sdt) values (encode(digest(v_token, 'sha256'), 'hex'), v_sdt);
  return jsonb_build_object('token', v_token) || lt_cac_lop(v_token);
end $$;

create or replace function public.lt_cac_lop(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare v_sdt text := sdt_tu_phien(p_token);
begin
  if v_sdt is null then return jsonb_build_object('loi', 'het-phien'); end if;
  return jsonb_build_object('lop', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', l.id, 'ma', l.ma, 'ten_lop', l.ten_lop, 'truong', l.truong, 'giao_dien', l.giao_dien,
      'nien_khoa_ket_thuc', l.nien_khoa_ket_thuc, 'ho_ten', lt.ho_ten,
      'so_cho_duyet', (select count(*) from anh a where a.lop_id = l.id and a.trang_thai = 'cho-duyet' and a.da_tai_xong))
      order by l.nien_khoa_ket_thuc desc nulls last, l.ten_lop)
    from lop_truong lt join lop l on l.id = lt.lop_id
    where lt.sdt = v_sdt and l.trang_thai <> 'luu-tru'), '[]'::jsonb));
end $$;

create or replace function public.dang_xuat_lop_truong(p_token text) returns void
language sql volatile security definer set search_path = public, extensions as $$
  delete from phien_lop_truong where p_token is not null and token_hash = encode(digest(p_token, 'sha256'), 'hex');
$$;

grant execute on function public.dang_nhap_lop_truong(text, text) to anon, authenticated;
grant execute on function public.lt_cac_lop(text) to anon, authenticated;
grant execute on function public.dang_xuat_lop_truong(text) to anon, authenticated;

-- ============================================================
-- 9. Lớp trưởng: dữ liệu một lớp, duyệt ảnh, xếp ảnh, buổi họp
--    Mọi hàm kiểm token phía máy chủ; sai thì trả {"loi":"het-phien"}.
-- ============================================================
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
                              'trang_thai', l.trang_thai),
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

create or replace function public.lt_doi_trang_thai_anh(p_token text, p_lop uuid, p_ids uuid[], p_trang_thai text)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare n int;
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  if p_trang_thai not in ('da-duyet', 'an', 'cho-duyet') then return jsonb_build_object('loi', 'trang-thai'); end if;
  update anh set trang_thai = p_trang_thai where lop_id = p_lop and id = any(p_ids);
  get diagnostics n = row_count;
  return jsonb_build_object('so_anh', n);
end $$;

-- Xếp ảnh: vào một buổi họp (p_chuong_id) hoặc một mục ảnh xưa (p_muc; null = chưa rõ)
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
    if p_muc is not null and p_muc not in ('lop-10','lop-11','lop-12','cam-trai','be-giang','khac') then
      return jsonb_build_object('loi', 'muc-sai');
    end if;
    update anh set loai = 'xua', chuong_id = null, muc = p_muc
    where lop_id = p_lop and id = any(p_ids) and coalesce(muc, '') <> 'chan-dung';
  end if;
  get diagnostics n = row_count;
  return jsonb_build_object('so_anh', n);
end $$;

-- Tạo (p_id null) hoặc sửa một buổi họp
create or replace function public.lt_luu_chuong(p_token text, p_lop uuid, p_id uuid, p_tieu_de text, p_ngay date,
                                                p_dia_diem text, p_mo_ta text, p_video_url text)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  if nullif(trim(p_tieu_de), '') is null then return jsonb_build_object('loi', 'tieu-de'); end if;
  if nullif(trim(p_video_url), '') is not null and trim(p_video_url) !~ '^https?://' then
    return jsonb_build_object('loi', 'video');
  end if;
  if p_id is null then
    insert into chuong (lop_id, tieu_de, ngay, dia_diem, mo_ta, video_url)
    values (p_lop, trim(p_tieu_de), p_ngay, nullif(trim(p_dia_diem), ''), nullif(trim(p_mo_ta), ''), nullif(trim(p_video_url), ''))
    returning id into v_id;
  else
    update chuong set tieu_de = trim(p_tieu_de), ngay = p_ngay, dia_diem = nullif(trim(p_dia_diem), ''),
                      mo_ta = nullif(trim(p_mo_ta), ''), video_url = nullif(trim(p_video_url), '')
    where id = p_id and lop_id = p_lop
    returning id into v_id;
    if v_id is null then return jsonb_build_object('loi', 'buoi-sai'); end if;
  end if;
  return jsonb_build_object('id', v_id);
end $$;

-- Xóa buổi họp: chỉ khi buổi đó chưa có ảnh (buổi có ảnh thì nhờ chủ dịch vụ, tránh mất album)
create or replace function public.lt_xoa_chuong(p_token text, p_lop uuid, p_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  if exists (select 1 from anh a where a.chuong_id = p_id) then return jsonb_build_object('loi', 'co-anh'); end if;
  delete from chuong where id = p_id and lop_id = p_lop;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.lt_dat_anh_tap_the(p_token text, p_lop uuid, p_chuong_id uuid, p_anh_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  if not exists (select 1 from anh a where a.id = p_anh_id and a.lop_id = p_lop)
     or not exists (select 1 from chuong c where c.id = p_chuong_id and c.lop_id = p_lop) then
    return jsonb_build_object('loi', 'sai');
  end if;
  update anh set trang_thai = 'da-duyet' where id = p_anh_id;
  update chuong set anh_tap_the_id = p_anh_id where id = p_chuong_id;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.lt_du_lieu(text, uuid) to anon, authenticated;
grant execute on function public.lt_doi_trang_thai_anh(text, uuid, uuid[], text) to anon, authenticated;
grant execute on function public.lt_xep_anh(text, uuid, uuid[], uuid, text) to anon, authenticated;
grant execute on function public.lt_luu_chuong(text, uuid, uuid, text, date, text, text, text) to anon, authenticated;
grant execute on function public.lt_xoa_chuong(text, uuid, uuid) to anon, authenticated;
grant execute on function public.lt_dat_anh_tap_the(text, uuid, uuid, uuid) to anon, authenticated;

-- ============================================================
-- 10. Chủ dịch vụ: tài khoản lớp trưởng, danh sách lớp có SĐT và ảnh chờ duyệt
-- ============================================================
-- Thêm lớp trưởng. Trả về PIN mới, hoặc dung_chung = true nếu SĐT này đã là lớp trưởng lớp khác
-- (một người một PIN: dùng chung PIN đang có).
create or replace function public.qt_them_lop_truong(p_lop uuid, p_ho_ten text, p_sdt text)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_sdt text := chuan_hoa_sdt(p_sdt);
  v_hash text;
  v_pin text;
  v_id uuid;
  v_lop_khac text;
begin
  if not la_quan_tri_he_thong() then raise exception 'Không có quyền'; end if;
  if nullif(trim(p_ho_ten), '') is null then return jsonb_build_object('loi', 'ho-ten'); end if;
  if v_sdt !~ '^0[0-9]{9}$' then return jsonb_build_object('loi', 'sdt'); end if;
  if exists (select 1 from lop_truong where lop_id = p_lop and sdt = v_sdt) then return jsonb_build_object('loi', 'trung'); end if;
  if (select count(*) from lop_truong where lop_id = p_lop) >= 2 then return jsonb_build_object('loi', 'du-2'); end if;

  select lt.pin_hash, 'lớp ' || l.ten_lop || ' · ' || l.truong into v_hash, v_lop_khac
  from lop_truong lt join lop l on l.id = lt.lop_id where lt.sdt = v_sdt order by lt.tao_luc limit 1;
  if v_hash is null then
    v_pin := tao_pin();
    v_hash := crypt(v_pin, gen_salt('bf'));
  end if;
  insert into lop_truong (lop_id, ho_ten, sdt, pin_hash) values (p_lop, trim(p_ho_ten), v_sdt, v_hash)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'sdt', v_sdt, 'pin', v_pin, 'dung_chung', v_pin is null, 'lop_khac', v_lop_khac);
end $$;

-- Tạo PIN mới cho một lớp trưởng (áp dụng cho mọi lớp cùng SĐT), đăng xuất mọi máy, gỡ khóa.
create or replace function public.qt_tao_pin_moi(p_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_sdt text;
  v_pin text := tao_pin();
  v_so_lop int;
begin
  if not la_quan_tri_he_thong() then raise exception 'Không có quyền'; end if;
  select sdt into v_sdt from lop_truong where id = p_id;
  if v_sdt is null then return jsonb_build_object('loi', 'khong-tim-thay'); end if;
  update lop_truong set pin_hash = crypt(v_pin, gen_salt('bf')) where sdt = v_sdt;
  get diagnostics v_so_lop = row_count;
  delete from phien_lop_truong where sdt = v_sdt;
  delete from lan_sai_pin where sdt = v_sdt;
  return jsonb_build_object('pin', v_pin, 'sdt', v_sdt, 'so_lop', v_so_lop);
end $$;

create or replace function public.qt_xoa_lop_truong(p_id uuid)
returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not la_quan_tri_he_thong() then raise exception 'Không có quyền'; end if;
  delete from lop_truong where id = p_id;
end $$;

-- Danh sách lớp cho trang quản trị: kèm lớp trưởng (tên + SĐT) và số ảnh chờ duyệt
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
      'luon_can_mat_khau', l.luon_can_mat_khau,
      'lop_truong', coalesce((select jsonb_agg(jsonb_build_object('id', lt.id, 'ho_ten', lt.ho_ten, 'sdt', lt.sdt) order by lt.tao_luc)
                              from lop_truong lt where lt.lop_id = l.id), '[]'::jsonb),
      'so_cho_duyet', (select count(*) from anh a where a.lop_id = l.id and a.trang_thai = 'cho-duyet' and a.da_tai_xong)
    ) order by l.tao_luc desc)
    from lop l), '[]'::jsonb);
end $$;

grant execute on function public.qt_them_lop_truong(uuid, text, text) to authenticated;
grant execute on function public.qt_tao_pin_moi(uuid) to authenticated;
grant execute on function public.qt_xoa_lop_truong(uuid) to authenticated;
grant execute on function public.qt_ds_lop() to authenticated;
revoke execute on function public.qt_them_lop_truong(uuid, text, text) from public, anon;
revoke execute on function public.qt_tao_pin_moi(uuid) from public, anon;
revoke execute on function public.qt_xoa_lop_truong(uuid) from public, anon;
revoke execute on function public.qt_ds_lop() from public, anon;
