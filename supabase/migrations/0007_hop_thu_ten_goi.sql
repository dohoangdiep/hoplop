-- hoplop: Hộp thư thời gian + đổi tên gọi của lớp (tên cũ vẫn chuyển hướng)
-- Chạy trong Supabase → SQL Editor sau file 0006. Chạy một lần.

create extension if not exists pgcrypto;

-- Ngày hôm nay theo giờ Việt Nam
create or replace function public.hom_nay_vn() returns date
language sql stable as $$ select (now() at time zone 'Asia/Ho_Chi_Minh')::date $$;

-- ============================================================
-- 1. Hộp thư thời gian
--    Thư hẹn mở vào một buổi họp (theo ngày của buổi đó) hoặc một ngày cụ thể.
--    Trước ngày mở, máy chủ KHÔNG BAO GIỜ trả nội dung thư: chỉ tên người viết và ngày mở.
-- ============================================================
alter table public.thu_hen_gio add column if not exists an boolean not null default false;
create index if not exists thu_hen_gio_lop on public.thu_hen_gio(lop_id);

-- Ngày mở của một lá thư: theo ngày buổi họp (nếu buổi đổi ngày thì thư đổi theo), không thì ngày đã hẹn
create or replace function public.ngay_mo_thu(t public.thu_hen_gio) returns date
language sql stable security definer set search_path = public as $$
  select coalesce((select c.ngay from chuong c where c.id = t.mo_vao_chuong_id), t.mo_vao_ngay);
$$;
revoke execute on function public.ngay_mo_thu(public.thu_hen_gio) from public, anon, authenticated;

create or replace function public.thu_cua_lop(p_khoa text, p_mat_khau text default null, p_token text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  l lop%rowtype;
  v_khoa text := lower(trim(coalesce(p_khoa, '')));
  v_vai text;
  v_hom_nay date := hom_nay_vn();
begin
  select * into l from lop where (ma = v_khoa or ten_goi = v_khoa) and trang_thai <> 'luu-tru'
  order by (ma = v_khoa) desc limit 1;
  if not found then return jsonb_build_object('loi', 'khong-tim-thay'); end if;
  v_vai := quyen_vao_lop(l.id, l.ma <> v_khoa, p_mat_khau, p_token);
  if v_vai in ('can-mat-khau', 'tam-khoa') then return jsonb_build_object('loi', v_vai); end if;

  return jsonb_build_object(
    'hom_nay', v_hom_nay,
    'thu', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'nguoi_viet', x.nguoi_viet, 'tao_luc', x.tao_luc, 'ngay_mo', x.ngay_mo,
        'buoi', x.buoi, 'da_mo', x.da_mo,
        'noi_dung', case when x.da_mo then x.noi_dung end)
        order by x.da_mo desc, x.ngay_mo, x.tao_luc)
      from (
        select t.id, t.nguoi_viet, t.tao_luc, t.noi_dung, ngay_mo_thu(t) as ngay_mo,
               (select c.tieu_de from chuong c where c.id = t.mo_vao_chuong_id) as buoi,
               coalesce(ngay_mo_thu(t) <= v_hom_nay, false) as da_mo
        from thu_hen_gio t where t.lop_id = l.id and not t.an
      ) x), '[]'::jsonb));
end $$;
grant execute on function public.thu_cua_lop(text, text, text) to anon, authenticated;

-- Viết một lá thư. Hẹn mở vào một buổi họp sắp tới (p_chuong_id) hoặc một ngày (p_ngay), phải sau hôm nay.
create or replace function public.viet_thu(p_khoa text, p_nguoi_viet text, p_noi_dung text,
                                           p_chuong_id uuid default null, p_ngay date default null,
                                           p_mat_khau text default null, p_token text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  l lop%rowtype;
  v_khoa text := lower(trim(coalesce(p_khoa, '')));
  v_vai text;
  v_ngay date;
  v_id uuid;
begin
  select * into l from lop where (ma = v_khoa or ten_goi = v_khoa) and trang_thai not in ('luu-tru')
  order by (ma = v_khoa) desc limit 1;
  if not found then return jsonb_build_object('loi', 'khong-tim-thay'); end if;
  if l.trang_thai = 'chi-xem' then return jsonb_build_object('loi', 'chi-xem'); end if;
  v_vai := quyen_vao_lop(l.id, l.ma <> v_khoa, p_mat_khau, p_token);
  if v_vai in ('can-mat-khau', 'tam-khoa') then return jsonb_build_object('loi', v_vai); end if;

  if nullif(trim(p_nguoi_viet), '') is null or length(trim(p_nguoi_viet)) > 60 then return jsonb_build_object('loi', 'ten'); end if;
  if nullif(trim(p_noi_dung), '') is null then return jsonb_build_object('loi', 'trong'); end if;
  if length(p_noi_dung) > 3000 then return jsonb_build_object('loi', 'dai'); end if;

  if p_chuong_id is not null then
    select c.ngay into v_ngay from chuong c where c.id = p_chuong_id and c.lop_id = l.id;
    if not found then return jsonb_build_object('loi', 'buoi-sai'); end if;
    if v_ngay is null then return jsonb_build_object('loi', 'buoi-chua-co-ngay'); end if;
  else
    v_ngay := p_ngay;
  end if;
  if v_ngay is null or v_ngay <= hom_nay_vn() then return jsonb_build_object('loi', 'ngay'); end if;
  if v_ngay > hom_nay_vn() + interval '50 years' then return jsonb_build_object('loi', 'ngay'); end if;

  if (select count(*) from thu_hen_gio where lop_id = l.id and tao_luc > now() - interval '1 hour') >= 30 then
    return jsonb_build_object('loi', 'qua-nhieu');
  end if;

  insert into thu_hen_gio (lop_id, nguoi_viet, noi_dung, mo_vao_chuong_id, mo_vao_ngay)
  values (l.id, trim(p_nguoi_viet), trim(p_noi_dung), p_chuong_id, v_ngay)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'ngay_mo', v_ngay);
end $$;
grant execute on function public.viet_thu(text, text, text, uuid, date, text, text) to anon, authenticated;

-- ============================================================
-- 2. Đổi tên gọi: tên cũ được giữ lại để link cũ vẫn chuyển hướng
-- ============================================================
create table if not exists public.ten_goi_cu (
  ten_goi text primary key,
  lop_id uuid not null references public.lop(id) on delete cascade,
  tao_luc timestamptz not null default now()
);
alter table public.ten_goi_cu enable row level security;
-- Không có policy: chỉ hàm security definer bên dưới đọc/ghi.

-- Quản trị đặt (hoặc bỏ, p_ten_goi rỗng) tên gọi cho lớp
create or replace function public.qt_dat_ten_goi(p_lop uuid, p_ten_goi text)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_moi text := nullif(lower(trim(coalesce(p_ten_goi, ''))), '');
  v_cu text;
begin
  if not la_quan_tri_he_thong() then raise exception 'Không có quyền'; end if;
  select ten_goi into v_cu from lop where id = p_lop;
  if not found then return jsonb_build_object('loi', 'khong-tim-thay'); end if;
  if v_moi is not distinct from v_cu then return jsonb_build_object('ten_goi', v_cu); end if;

  if v_moi is not null then
    if v_moi !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then return jsonb_build_object('loi', 'dang'); end if;
    -- Không được trông giống mã lớp (6 ký tự trong bảng mã): mã sinh sau này có thể trùng và cướp link
    if v_moi ~ '^[a-hjkmnp-z2-9]{6}$' then return jsonb_build_object('loi', 'giong-ma'); end if;
    if v_moi in ('quan-tri', 'lop-truong', 'xemmau', 'gui-anh', 'q', 'api', 'admin') then return jsonb_build_object('loi', 'trung'); end if;
    if exists (select 1 from lop where (ma = v_moi or ten_goi = v_moi) and id <> p_lop)
       or exists (select 1 from ten_goi_cu where ten_goi = v_moi and lop_id <> p_lop) then
      return jsonb_build_object('loi', 'trung');
    end if;
    delete from ten_goi_cu where ten_goi = v_moi and lop_id = p_lop;
  end if;
  if v_cu is not null then
    insert into ten_goi_cu (ten_goi, lop_id) values (v_cu, p_lop) on conflict (ten_goi) do nothing;
  end if;
  update lop set ten_goi = v_moi where id = p_lop;
  return jsonb_build_object('ten_goi', v_moi);
end $$;
grant execute on function public.qt_dat_ten_goi(uuid, text) to authenticated;
revoke execute on function public.qt_dat_ten_goi(uuid, text) from public, anon;

-- Link dùng tên gọi cũ: trả về tên gọi hiện tại của lớp (vào bằng tên gọi vẫn phải nhập mật khẩu).
-- KHÔNG BAO GIỜ trả mã lớp: tên gọi dễ đoán, còn mã lớp mở được lớp không cần mật khẩu.
-- Lớp đã bỏ tên gọi thì link cũ hết dùng được (trả null).
create or replace function public.dia_chi_moi(p_khoa text)
returns text
language sql stable security definer set search_path = public as $$
  select l.ten_goi from ten_goi_cu c join lop l on l.id = c.lop_id
  where c.ten_goi = lower(trim(coalesce(p_khoa, ''))) and l.trang_thai <> 'luu-tru';
$$;
grant execute on function public.dia_chi_moi(text) to anon, authenticated;
