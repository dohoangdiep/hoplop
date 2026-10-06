-- hoplop: lớp trưởng / lớp phó tự làm Tái hiện và Góc thầy cô (trên trang /lop-truong)
-- Chạy trong Supabase → SQL Editor sau file 0008. Chạy một lần.
-- Như các hàm lt_* khác: kiểm token phiên lớp trưởng phía máy chủ, chỉ đụng tới dữ liệu lớp của token.

-- Danh sách Tái hiện và thầy cô của lớp (kèm đường dẫn ảnh, mọi trạng thái)
create or replace function public.lt_ds_them(p_token text, p_lop uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  return jsonb_build_object(
    'tai_hien', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'anh_xua_id', t.anh_xua_id, 'anh_nay_id', t.anh_nay_id,
                       'chu_thich', t.chu_thich, 'nam_xua', t.nam_xua, 'nam_nay', t.nam_nay,
                       'xua', (select a.duong_dan_xem from anh a where a.id = t.anh_xua_id),
                       'nay', (select a.duong_dan_xem from anh a where a.id = t.anh_nay_id))
                       order by t.thu_tu, t.tao_luc)
      from tai_hien t where t.lop_id = p_lop), '[]'::jsonb),
    'thay_co', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'ho_ten', c.ho_ten, 'vai_tro', c.vai_tro, 'mon', c.mon,
                       'cau_noi', c.cau_noi, 'anh_id', c.anh_id, 'thu_tu', c.thu_tu,
                       'anh', (select a.duong_dan_xem from anh a where a.id = c.anh_id))
                       order by c.thu_tu, c.ho_ten)
      from thay_co c where c.lop_id = p_lop), '[]'::jsonb));
end $$;

-- Ảnh vừa tải lên cho Tái hiện / thầy cô: chuyển thành ảnh riêng (không hiện trong kho ảnh xưa).
-- Chỉ áp dụng cho ảnh tải lên trong vòng 1 giờ, để không "giấu" được ảnh cũ trong kho.
create or replace function public.lt_dat_anh_rieng(p_token text, p_lop uuid, p_anh_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  update anh set loai = 'xua', chuong_id = null, muc = 'chan-dung', trang_thai = 'da-duyet'
  where id = p_anh_id and lop_id = p_lop and tao_luc > now() - interval '1 hour';
  if not found then return jsonb_build_object('loi', 'anh-sai'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Tạo (p_id null) hoặc sửa một cặp Tái hiện. Hai ảnh phải thuộc lớp; ảnh được duyệt luôn.
create or replace function public.lt_luu_tai_hien(p_token text, p_lop uuid, p_id uuid, p_anh_xua uuid, p_anh_nay uuid,
                                                  p_chu_thich text, p_nam_xua int, p_nam_nay int)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  if p_anh_xua is null or p_anh_nay is null then return jsonb_build_object('loi', 'thieu-anh'); end if;
  if (select count(*) from anh where id in (p_anh_xua, p_anh_nay) and lop_id = p_lop) < (case when p_anh_xua = p_anh_nay then 1 else 2 end) then
    return jsonb_build_object('loi', 'anh-sai');
  end if;
  if (p_nam_xua is not null and (p_nam_xua < 1950 or p_nam_xua > 2100)) or (p_nam_nay is not null and (p_nam_nay < 1950 or p_nam_nay > 2100)) then
    return jsonb_build_object('loi', 'nam');
  end if;
  update anh set trang_thai = 'da-duyet' where id in (p_anh_xua, p_anh_nay) and lop_id = p_lop;
  if p_id is null then
    insert into tai_hien (lop_id, anh_xua_id, anh_nay_id, chu_thich, nam_xua, nam_nay, thu_tu)
    values (p_lop, p_anh_xua, p_anh_nay, nullif(trim(p_chu_thich), ''), p_nam_xua, p_nam_nay,
            (select coalesce(max(thu_tu), 0) + 1 from tai_hien where lop_id = p_lop))
    returning id into v_id;
  else
    update tai_hien set anh_xua_id = p_anh_xua, anh_nay_id = p_anh_nay, chu_thich = nullif(trim(p_chu_thich), ''),
                        nam_xua = p_nam_xua, nam_nay = p_nam_nay
    where id = p_id and lop_id = p_lop returning id into v_id;
    if v_id is null then return jsonb_build_object('loi', 'khong-tim-thay'); end if;
  end if;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.lt_xoa_tai_hien(p_token text, p_lop uuid, p_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  delete from tai_hien where id = p_id and lop_id = p_lop;
  return jsonb_build_object('ok', true);
end $$;

-- Tạo (p_id null) hoặc sửa một thầy cô
create or replace function public.lt_luu_thay_co(p_token text, p_lop uuid, p_id uuid, p_ho_ten text, p_vai_tro text,
                                                 p_mon text, p_cau_noi text, p_anh_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  if nullif(trim(p_ho_ten), '') is null or length(trim(p_ho_ten)) > 80 then return jsonb_build_object('loi', 'ho-ten'); end if;
  if length(coalesce(p_cau_noi, '')) > 500 then return jsonb_build_object('loi', 'dai'); end if;
  if p_anh_id is not null then
    if not exists (select 1 from anh where id = p_anh_id and lop_id = p_lop) then return jsonb_build_object('loi', 'anh-sai'); end if;
    update anh set trang_thai = 'da-duyet' where id = p_anh_id;
  end if;
  if p_id is null then
    insert into thay_co (lop_id, ho_ten, vai_tro, mon, cau_noi, anh_id, thu_tu)
    values (p_lop, trim(p_ho_ten), nullif(trim(p_vai_tro), ''), nullif(trim(p_mon), ''), nullif(trim(p_cau_noi), ''), p_anh_id,
            (select coalesce(max(thu_tu), 0) + 1 from thay_co where lop_id = p_lop))
    returning id into v_id;
  else
    update thay_co set ho_ten = trim(p_ho_ten), vai_tro = nullif(trim(p_vai_tro), ''), mon = nullif(trim(p_mon), ''),
                       cau_noi = nullif(trim(p_cau_noi), ''), anh_id = p_anh_id
    where id = p_id and lop_id = p_lop returning id into v_id;
    if v_id is null then return jsonb_build_object('loi', 'khong-tim-thay'); end if;
  end if;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.lt_xoa_thay_co(p_token text, p_lop uuid, p_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not la_lop_truong(p_token, p_lop) then return jsonb_build_object('loi', 'het-phien'); end if;
  delete from thay_co where id = p_id and lop_id = p_lop;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.lt_ds_them(text, uuid) to anon, authenticated;
grant execute on function public.lt_dat_anh_rieng(text, uuid, uuid) to anon, authenticated;
grant execute on function public.lt_luu_tai_hien(text, uuid, uuid, uuid, uuid, text, int, int) to anon, authenticated;
grant execute on function public.lt_xoa_tai_hien(text, uuid, uuid) to anon, authenticated;
grant execute on function public.lt_luu_thay_co(text, uuid, uuid, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.lt_xoa_thay_co(text, uuid, uuid) to anon, authenticated;
