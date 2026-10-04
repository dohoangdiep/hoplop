-- hoplop: thành viên mở trang lớp bằng mật khẩu
-- Chạy trong Supabase → SQL Editor sau file 0001.

-- Ghi nhận lần nhập sai để chặn dò mật khẩu
create table if not exists public.lan_nhap_sai (
  id bigserial primary key,
  lop_id uuid not null references public.lop(id) on delete cascade,
  luc timestamptz not null default now()
);
create index if not exists lan_nhap_sai_lop_luc on public.lan_nhap_sai(lop_id, luc);
alter table public.lan_nhap_sai enable row level security;
-- Không có policy: chỉ hàm security definer bên dưới được đọc/ghi.

-- Trả về toàn bộ nội dung hiển thị của lớp nếu:
--   lớp công khai (lớp mẫu), hoặc người gọi là quản trị lớp, hoặc mật khẩu đúng.
-- Sai mật khẩu quá 10 lần trong 10 phút thì tạm khóa.
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
      'giao_dien', l.giao_dien, 'trang_thai', l.trang_thai),
    'thanh_vien', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'ho_ten', t.ho_ten, 'ten_goi_tat', t.ten_goi_tat, 'biet_danh', t.biet_danh,
        'noi_o', case when t.an_thong_tin then null else t.noi_o end,
        'cau_luu_but', t.cau_luu_but) order by t.thu_tu, t.ho_ten)
      from thanh_vien t where t.lop_id = l.id), '[]'::jsonb),
    'so_do', (select jsonb_build_object('so_day', s.so_day, 'so_ban_moi_day', s.so_ban_moi_day, 'cho_moi_ban', s.cho_moi_ban)
              from so_do s where s.lop_id = l.id),
    'cho_ngoi', coalesce((
      select jsonb_agg(jsonb_build_object('day', c.day, 'ban', c.ban, 'vi_tri', c.vi_tri, 'thanh_vien_id', c.thanh_vien_id))
      from cho_ngoi c where c.lop_id = l.id), '[]'::jsonb),
    'chuong', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'tieu_de', c.tieu_de, 'ngay', c.ngay, 'dia_diem', c.dia_diem)
                       order by c.ngay desc nulls last)
      from chuong c where c.lop_id = l.id), '[]'::jsonb)
  );
end $$;
grant execute on function public.xem_lop(text, text) to anon, authenticated;
