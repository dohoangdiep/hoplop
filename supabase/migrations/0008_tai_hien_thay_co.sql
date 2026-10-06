-- hoplop: Tái hiện (ảnh xưa – ảnh chụp lại cùng tư thế) và Góc thầy cô
-- Chạy trong Supabase → SQL Editor sau file 0007. Chạy một lần.
-- Hai bảng tai_hien, thay_co đã có từ 0001 (quản trị đọc/ghi trực tiếp qua RLS); ở đây thêm cột
-- và một hàm để trang lớp đọc (cùng quy tắc vào lớp như xem_lop).

alter table public.tai_hien add column if not exists nam_xua int;
alter table public.tai_hien add column if not exists nam_nay int;
alter table public.tai_hien add column if not exists thu_tu int not null default 0;
alter table public.tai_hien add column if not exists tao_luc timestamptz not null default now();
alter table public.thay_co add column if not exists thu_tu int not null default 0;
create index if not exists tai_hien_lop on public.tai_hien(lop_id);
create index if not exists thay_co_lop on public.thay_co(lop_id);

-- Nội dung thêm của trang lớp: các cặp Tái hiện (đủ cả hai ảnh đã duyệt) và Góc thầy cô.
create or replace function public.xem_lop_them(p_khoa text, p_mat_khau text default null, p_token text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  l lop%rowtype;
  v_khoa text := lower(trim(coalesce(p_khoa, '')));
  v_vai text;
begin
  select * into l from lop where (ma = v_khoa or ten_goi = v_khoa) and trang_thai <> 'luu-tru'
  order by (ma = v_khoa) desc limit 1;
  if not found then return jsonb_build_object('loi', 'khong-tim-thay'); end if;
  v_vai := quyen_vao_lop(l.id, l.ma <> v_khoa, p_mat_khau, p_token);
  if v_vai in ('can-mat-khau', 'tam-khoa') then return jsonb_build_object('loi', v_vai); end if;

  return jsonb_build_object(
    'tai_hien', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'chu_thich', t.chu_thich, 'nam_xua', t.nam_xua, 'nam_nay', t.nam_nay,
                                          'xua', ax.duong_dan_xem, 'nay', an.duong_dan_xem)
                       order by t.thu_tu, t.tao_luc)
      from tai_hien t
      join anh ax on ax.id = t.anh_xua_id and ax.trang_thai = 'da-duyet' and ax.da_tai_xong
      join anh an on an.id = t.anh_nay_id and an.trang_thai = 'da-duyet' and an.da_tai_xong
      where t.lop_id = l.id), '[]'::jsonb),
    'thay_co', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'ho_ten', c.ho_ten, 'vai_tro', c.vai_tro, 'mon', c.mon, 'cau_noi', c.cau_noi,
                                          'anh', (select a.duong_dan_xem from anh a where a.id = c.anh_id and a.trang_thai = 'da-duyet'))
                       order by c.thu_tu, c.ho_ten)
      from thay_co c where c.lop_id = l.id), '[]'::jsonb));
end $$;
grant execute on function public.xem_lop_them(text, text, text) to anon, authenticated;
