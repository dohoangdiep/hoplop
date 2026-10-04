-- hoplop: thêm mục 'chan-dung' cho ảnh chân dung từng bạn (không hiện trong kho ảnh xưa)
-- Chạy trong Supabase → SQL Editor sau file 0003.

alter table public.anh drop constraint if exists anh_muc_check;
alter table public.anh add constraint anh_muc_check
  check (muc is null or muc in ('lop-10','lop-11','lop-12','cam-trai','be-giang','khac','chan-dung'));
