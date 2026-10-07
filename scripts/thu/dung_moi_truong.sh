#!/usr/bin/env bash
# Dựng môi trường thử cục bộ giống Supabase để chạy bộ thử đầu-cuối (không đụng tới Supabase thật):
#   Postgres 16 (cổng 54329, socket /var/tmp/hoplop-pg) + database "hoplop" đã chạy mọi file supabase/migrations
#   PostgREST 12 (cổng 3010) — trình duyệt thử gọi REST/RPC qua đây, có phân quyền anon / authenticated như Supabase
# Chạy lại được nhiều lần: database "hoplop" được làm mới mỗi lần.
#
# Cách dùng (từ gốc kho):
#   bash scripts/thu/dung_moi_truong.sh
#   npm run build
#   python3 scripts/thu/thu_trang_lop.py     # trang lớp, gửi ảnh, lớp trưởng
#   python3 scripts/thu/thu_quan_tri.py      # trang quản trị (đăng nhập email giả lập)
# Ảnh chụp màn hình ở /tmp/hoplop-thu-anh (đổi bằng biến THU_ANH).
# Cần: postgresql-16, python3 + psycopg2 + playwright (Chromium), Pillow.
set -euo pipefail
GOC="$(cd "$(dirname "$0")/../.." && pwd)"
D=/var/tmp/hoplop-pg
B=$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)
PR_DIR=/var/tmp/hoplop-postgrest
PR_VER=v12.2.3

# initdb/pg_ctl không chạy dưới root: dùng tài khoản đang sở hữu cụm (hoặc một tài khoản thường) nếu đang là root
NGUOI=$(stat -c %U "$D/data" 2>/dev/null || true)
if [ -z "$NGUOI" ] || [ "$NGUOI" = root ]; then NGUOI=$(getent passwd | awk -F: '$3>=999 && $3<60000 {print $1; exit}'); fi
CHAY() { if [ "$(id -u)" = 0 ]; then su "$NGUOI" -s /bin/bash -c "$*"; else bash -c "$*"; fi; }

mkdir -p "$D"; [ "$(id -u)" = 0 ] && chown "$NGUOI" "$D" || true
if [ ! -d "$D/data" ]; then CHAY "$B/initdb -D $D/data -U postgres --auth=trust -E UTF8 >/dev/null"; fi
CHAY "$B/pg_ctl -D $D/data status >/dev/null 2>&1 || $B/pg_ctl -D $D/data -o '-p 54329 -k $D' -l $D/pg.log start >/dev/null"
sleep 2
P="psql -h $D -p 54329 -U postgres -v ON_ERROR_STOP=1 -qAt"
$P -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='hoplop' and pid <> pg_backend_pid()" >/dev/null
$P -c "drop database if exists hoplop" -c "create database hoplop"
$P -d hoplop <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator login noinherit; end if;
end $$;
grant anon, authenticated to authenticator;
create schema extensions; create extension pgcrypto schema extensions;
create schema auth;
create table auth.users(id uuid primary key, email text);
-- Như Supabase: đọc sub từ request.jwt.claims (PostgREST 12) hoặc request.jwt.claim.sub (bản cũ)
create function auth.uid() returns uuid language sql stable as $f$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $f$;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean);
create table storage.objects(id bigserial, bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql as $f$
  select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $f$;
alter table storage.objects enable row level security;
grant usage on schema public, extensions, auth, storage to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
alter database hoplop set search_path = public, extensions;
SQL
for f in "$GOC"/supabase/migrations/*.sql; do
  $P -d hoplop -f "$f" 2>&1 | grep -v NOTICE || true
  echo "  đã chạy $(basename "$f")"
done

# PostgREST: tải bản tĩnh chính thức từ GitHub nếu chưa có
if [ ! -x "$PR_DIR/postgrest" ]; then
  mkdir -p "$PR_DIR"
  curl -sSL -o "$PR_DIR/pr.tar.xz" "https://github.com/PostgREST/postgrest/releases/download/$PR_VER/postgrest-$PR_VER-linux-static-x64.tar.xz"
  tar -xJf "$PR_DIR/pr.tar.xz" -C "$PR_DIR" && rm "$PR_DIR/pr.tar.xz"
fi
cat > "$PR_DIR/postgrest.conf" <<CONF
db-uri = "postgres://authenticator@/hoplop?host=$D&port=54329"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "thu-cuc-bo-chi-de-test-khong-dung-that-0123456789"
server-port = 3010
server-host = "127.0.0.1"
CONF
if [ -f "$PR_DIR/pid" ]; then kill "$(cat "$PR_DIR/pid")" 2>/dev/null || true; sleep 1; fi
nohup "$PR_DIR/postgrest" "$PR_DIR/postgrest.conf" > "$PR_DIR/postgrest.log" 2>&1 &
echo $! > "$PR_DIR/pid"
sleep 2
curl -sf -o /dev/null http://127.0.0.1:3010/ && echo "Sẵn sàng: Postgres :54329 (db hoplop), PostgREST :3010"
