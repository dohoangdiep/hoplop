"""
Thử đầu-cuối trang quản trị: bản build thật trong Chromium.
REST + RPC của Supabase -> PostgREST cục bộ (cổng 3010) trên Postgres đã chạy 0001→0010.
Auth: phiên đăng nhập giả (JWT ký bằng secret của PostgREST cục bộ). Storage: giả lập trong bộ nhớ.
"""
import io, json, os, subprocess, sys, time, urllib.parse
from datetime import date, timedelta
import psycopg2
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jwt import jwt  # noqa: E402

OUT = os.environ.get('THU_ANH', '/tmp/hoplop-thu-anh')
os.makedirs(OUT, exist_ok=True)
DSN = dict(host='/var/tmp/hoplop-pg', port=54329, user='postgres', dbname='hoplop')
SB = 'https://yjimrzkxhlfehxjygvpj.supabase.co'
PGRST = 'http://127.0.0.1:3010'
ADMIN = '00000000-0000-0000-0000-00000000000a'
TOKEN_ADMIN = jwt(ADMIN, 'dohoangdiep@gmail.com')
NGUOI_LA = '00000000-0000-0000-0000-00000000000b'
TOKEN_LA = jwt(NGUOI_LA, 'nguoila@example.com')
A, B, C, D, E = (f'{c}{c}{c}{c}{c}{c}{c}{c}-0000-0000-0000-000000000000' for c in 'abcde')
HOM_NAY = date.today()

def db():
    c = psycopg2.connect(**DSN); c.autocommit = True; return c

def mot(sql, *a):
    with db() as c, c.cursor() as k:
        k.execute(sql, a)
        return k.fetchone() if k.description else None

def jpg(chu, mau):
    im = Image.new('RGB', (800, 600), mau); d = ImageDraw.Draw(im)
    d.rectangle([30, 30, 770, 570], outline=(255, 255, 255), width=8); d.text((60, 60), chu, fill=(255, 255, 255))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=80); return b.getvalue()

FILES = {}
# ---------- dữ liệu ----------
with db() as c, c.cursor() as k:
    k.execute("""
    truncate lop cascade; truncate file_cho_xoa, lan_sai_pin, phien_lop_truong, lan_nhap_sai;
    insert into auth.users values (%(ad)s, 'dohoangdiep@gmail.com'), (%(la)s, 'nguoila@example.com') on conflict do nothing;
    insert into quan_tri_he_thong values (%(ad)s) on conflict do nothing;
    insert into lop(id, ma, ten_lop, truong, tinh, nien_khoa_bat_dau, nien_khoa_ket_thuc, trang_thai, het_han, tao_luc, cap) values
      (%(A)s, 'aaaaaa', '12A1', 'THPT Thanh Miện 2', 'Hải Dương', 2003, 2006, 'da-ban-giao', %(h1)s, now() - interval '5 day', 'thpt'),
      (%(B)s, 'bbbbbb', '9C', 'THCS Chu Văn An', 'Hà Nội', 2010, 2014, 'dang-dung', %(h2)s, now() - interval '4 day', 'thcs'),
      (%(C)s, 'cccccc', '12D', 'THPT Kim Liên', 'Hà Nội', 1995, 1998, 'chi-xem', %(h3)s, now() - interval '3 day', 'thpt'),
      (%(D)s, 'dddddd', '5A', 'Tiểu học Đông Ngạc', 'Hà Nội', 2000, 2005, 'luu-tru', null, now() - interval '2 day', 'tieu-hoc'),
      (%(E)s, 'eeeeee', 'K45 Kế toán', 'ĐH Thương mại', 'Hà Nội', 2009, 2013, 'thu-tu-lieu', %(h1)s, now() - interval '1 day', 'dai-hoc');
    insert into so_do(lop_id) values (%(A)s), (%(B)s), (%(C)s), (%(D)s), (%(E)s);
    insert into lop_truong(lop_id, ho_ten, sdt, pin_hash) values
      (%(A)s, 'Nguyễn Thị Lan', '0912345678', crypt('123456', gen_salt('bf'))),
      (%(A)s, 'Trần Văn Hùng', '0987654321', crypt('123456', gen_salt('bf'))),
      (%(B)s, 'Phạm Minh Tú', '0903111222', crypt('111111', gen_salt('bf')));
    insert into thanh_vien(lop_id, ho_ten, thu_tu) values (%(A)s, 'Nguyễn Văn Hùng', 0), (%(A)s, 'Phạm Thị Lan', 1), (%(A)s, 'Lê Anh Tuấn', 2);
    """, dict(ad=ADMIN, la=NGUOI_LA, A=A, B=B, C=C, D=D, E=E,
              h1=HOM_NAY + timedelta(days=200), h2=HOM_NAY + timedelta(days=10), h3=HOM_NAY - timedelta(days=5)))
    for lop, i, tt in [(B, 1, 'cho-duyet'), (E, 2, 'da-duyet'), (E, 3, 'da-duyet'), (A, 4, 'da-duyet')]:
        aid = f'0000000{i}-1111-1111-1111-111111111111'
        xem, goc = f'lop/{lop}/xua/{aid}/xem.jpg', f'lop/{lop}/xua/{aid}/goc.jpg'
        k.execute("insert into anh(id, lop_id, loai, muc, trang_thai, da_tai_xong, duong_dan_xem, duong_dan_goc, nguoi_gui_ten) values (%s,%s,'xua','khac',%s,true,%s,%s,'Lan')",
                  (aid, lop, tt, xem, goc))
        FILES[xem] = FILES[goc] = jpg(f'anh {i}', [(90, 120, 80), (140, 90, 70), (70, 90, 140), (120, 70, 120)][i - 1])

# ---------- chuyển tiếp Supabase ----------
LOI = []
def jwt_cua(req):
    a = req.headers.get('authorization', '')
    t = a[7:] if a.lower().startswith('bearer ') else ''
    return t if t.count('.') == 2 else None

def la_admin(req):
    return jwt_cua(req) == TOKEN_ADMIN

def anon_sql(sql, *a, lt=None):
    with db() as c, c.cursor() as k:
        k.execute('set role anon')
        k.execute("select set_config('request.headers', %s, false)", (json.dumps({'x-hoplop-lt': lt} if lt else {}),))
        k.execute(sql, a); return k.fetchone()[0]

CORS = {'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range'}

def xu_ly(route, req):
    u = urllib.parse.urlparse(req.url); p = u.path
    try:
        if req.method == 'OPTIONS':
            return route.fulfill(status=200, headers={**CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'})
        if p.startswith('/rest/v1/'):
            h = {k: v for k, v in req.headers.items() if k.lower() in ('accept', 'content-type', 'prefer', 'range', 'range-unit', 'x-hoplop-lt', 'content-profile', 'accept-profile')}
            t = jwt_cua(req)
            if t: h['authorization'] = 'Bearer ' + t
            r = route.fetch(url=PGRST + p[len('/rest/v1'):] + (('?' + u.query) if u.query else ''), method=req.method, headers=h, post_data=req.post_data_buffer)
            if r.status >= 400: LOI.append(f'PGRST {r.status} {req.method} {p}: {r.text()[:200]}')
            return route.fulfill(status=r.status, headers={**r.headers, **CORS}, body=r.body())
        if p.startswith('/auth/v1/'):
            if p.endswith('/logout'): return route.fulfill(status=204, headers=CORS)
            if p.endswith('/user'): return route.fulfill(status=200, headers=CORS, content_type='application/json', body=json.dumps({'id': ADMIN, 'email': 'dohoangdiep@gmail.com', 'aud': 'authenticated'}))
            return route.fulfill(status=200, headers=CORS, content_type='application/json', body='{}')
        # ----- storage giả -----
        if p == '/storage/v1/object/sign/anh' and req.method == 'POST':
            out = []
            for d in json.loads(req.post_data)['paths']:
                ok = la_admin(req) or anon_sql('select public.cho_phep_xem_anh(%s)', d, lt=req.headers.get('x-hoplop-lt'))
                out.append({'path': d, 'signedURL': f'/object/sign/anh/{d}?token=t' if ok else None, 'error': None if ok else 'not found'})
            return route.fulfill(status=200, headers=CORS, content_type='application/json', body=json.dumps(out))
        if p.startswith('/storage/v1/object/sign/anh/'):
            d = urllib.parse.unquote(p[len('/storage/v1/object/sign/anh/'):])
            if req.method == 'POST':
                return route.fulfill(status=200, headers=CORS, content_type='application/json', body=json.dumps({'signedURL': f'/object/sign/anh/{d}?token=t'}))
            b = FILES.get(d)
            return route.fulfill(status=200 if b else 404, headers=CORS, content_type='image/jpeg', body=b or b'')
        if p.startswith('/storage/v1/object/anh') and req.method == 'DELETE':
            if not la_admin(req): return route.fulfill(status=403, headers=CORS, body='')
            ds = json.loads(req.post_data)['prefixes']
            for d in ds: FILES.pop(d, None)
            return route.fulfill(status=200, headers=CORS, content_type='application/json', body=json.dumps([{'name': d} for d in ds]))
        if p.startswith('/storage/v1/object/anh/') and req.method == 'POST':
            d = urllib.parse.unquote(p[len('/storage/v1/object/anh/'):])
            if not (la_admin(req) or anon_sql('select public.cho_phep_tai_anh(%s)', d)):
                return route.fulfill(status=403, headers=CORS, content_type='application/json', body='{"statusCode":"403","error":"Unauthorized","message":"rls"}')
            raw = req.post_data_buffer; i, j = raw.find(b'\xff\xd8'), raw.rfind(b'\xff\xd9')
            FILES[d] = raw[i:j + 2] if i >= 0 and j > i else raw
            return route.fulfill(status=200, headers=CORS, content_type='application/json', body=json.dumps({'Key': 'anh/' + d}))
        LOI.append(f'không giả lập: {req.method} {p}')
        return route.fulfill(status=404, headers=CORS, body='')
    except Exception as e:  # noqa: BLE001
        LOI.append(f'{p}: {e}')
        return route.fulfill(status=500, headers=CORS, body=str(e))

def phien(token, uid, email):
    s = {'access_token': token, 'token_type': 'bearer', 'expires_in': 86400, 'expires_at': int(time.time()) + 86400,
         'refresh_token': 'gia', 'user': {'id': uid, 'email': email, 'aud': 'authenticated', 'role': 'authenticated',
                                           'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-01-01T00:00:00Z'}}
    return "localStorage.setItem('sb-yjimrzkxhlfehxjygvpj-auth-token', %s)" % json.dumps(json.dumps(s))

srv = subprocess.Popen(['npx', 'vite', 'preview', '--port', '4174', '--strictPort'], cwd='/home/claude/hoplop', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(4)
BASE = 'http://localhost:4174'
kq = []
def kiem(ten, dk):
    kq.append(('OK ' if dk else 'SAI') + ' ' + ten); print(kq[-1], flush=True)

try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        def ctx_moi(w, h, token=TOKEN_ADMIN, uid=ADMIN, email='dohoangdiep@gmail.com'):
            cx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1 if w > 800 else 2, locale='vi-VN')
            cx.route(f'{SB}/**', xu_ly)
            cx.route('https://fonts.googleapis.com/**', lambda r, q: r.fulfill(status=200, content_type='text/css', body=''))
            cx.add_init_script(phien(token, uid, email))
            return cx
        loi_js = []

        # ===== Máy tính =====
        cx = ctx_moi(1280, 900); pg = cx.new_page(); pg.on('pageerror', lambda e: loi_js.append(str(e)))
        pg.on('dialog', lambda d: d.accept())
        pg.goto(f'{BASE}/quan-tri'); pg.wait_for_selector('.qt-dong', timeout=15000)
        so = {t.split('\n')[1]: int(t.split('\n')[0]) for t in pg.locator('.qt-o-so-nut').all_inner_texts()}
        kiem(f'ô số liệu đúng {so}', so == {'Đang hoạt động': 4, 'Có ảnh chờ duyệt': 1, 'Sắp hết hạn (30 ngày)': 1, 'Đã hết hạn': 1, 'Đã ẩn': 1})
        kiem('mặc định không hiện lớp đã ẩn', pg.locator('.qt-dong').count() == 4 and pg.locator('.qt-dong', has_text='Đông Ngạc').count() == 0)
        kiem('nhãn hạn: còn / sắp hết / hết hạn', pg.locator('.qt-nhan-han.sap-het').count() == 1 and pg.locator('.qt-nhan-han.het-han').count() == 1)
        kiem('lớp có ảnh chờ có huy hiệu dẫn tới tab Ảnh', pg.locator('a.qt-huy-hieu[href$="/anh"]').count() == 1)
        pg.screenshot(path=f'{OUT}/qt1-ds-may-tinh.png', full_page=True)

        pg.click('.qt-o-so-nut:has-text("Sắp hết hạn")')
        kiem('lọc Sắp hết hạn ra đúng lớp 9C', pg.locator('.qt-dong').count() == 1 and pg.locator('.qt-dong', has_text='9C').count() == 1)
        pg.fill('#tim-lop', '111 222')
        kiem('tìm theo vài số cuối SĐT lớp trưởng', pg.locator('.qt-dong').count() == 1 and pg.locator('.qt-dong', has_text='Chu Văn An').count() == 1)
        pg.fill('#tim-lop', 'dong ngac')
        kiem('tìm không dấu ra cả lớp đã ẩn', pg.locator('.qt-dong', has_text='Đông Ngạc').count() == 1)
        pg.fill('#tim-lop', '')
        pg.click('.qt-o-so-nut:has-text("Đang hoạt động")')

        # Gia hạn lớp hết hạn (đang Chỉ xem)
        dong = pg.locator('.qt-dong', has_text='Kim Liên')
        dong.locator('text=Hạn & trạng thái').click()
        pg.screenshot(path=f'{OUT}/qt2-thao-tac.png', full_page=True)
        dong.locator('text=Gia hạn 1 năm').click(); pg.wait_for_selector('text=Đã đặt hạn dùng đến', timeout=10000)
        han, tt = mot('select het_han, trang_thai from lop where id=%s', C)
        mong = date(HOM_NAY.year + 1, HOM_NAY.month, min(HOM_NAY.day, 28 if HOM_NAY.month == 2 else HOM_NAY.day))
        kiem(f'gia hạn 1 năm từ hôm nay (hạn cũ đã qua) → {han}, mở lại Chỉ xem → {tt}', han == mong and tt == 'da-ban-giao')
        kiem('nhãn đổi sang còn hạn', dong.locator('.qt-cot-han .qt-nhan-han.con-han').count() == 1)
        dong.locator('text=+ 6 tháng').click(); pg.wait_for_timeout(800)
        han2 = mot('select het_han from lop where id=%s', C)[0]
        kiem(f'+6 tháng cộng tiếp từ hạn hiện tại → {han2}', (han2 - han).days in range(181, 185))
        dong.locator('text=Hạn & trạng thái').click()

        # Ẩn rồi hiện lại lớp 12A1
        dong = pg.locator('.qt-dong', has_text='Thanh Miện')
        dong.locator('text=Hạn & trạng thái').click(); dong.locator('button:has-text("Ẩn lớp")').click()
        pg.wait_for_selector('.qt-thong-bao >> text=Đã ẩn lớp 12A1', timeout=10000)
        kiem('ẩn lớp: trạng thái lưu trữ', mot('select trang_thai from lop where id=%s', A)[0] == 'luu-tru')
        kiem('trang lớp đã ẩn báo không tìm thấy', anon_sql("select xem_lop('aaaaaa') ->> 'loi'") == 'khong-tim-thay')
        pg.click('.qt-o-so-nut:has-text("Đã ẩn")')
        kiem('lớp vừa ẩn nằm trong Đã ẩn', pg.locator('.qt-dong', has_text='Thanh Miện').count() == 1)
        dong = pg.locator('.qt-dong', has_text='Thanh Miện')
        if dong.locator('text=Hiện lại lớp').count() == 0: dong.locator('text=Hạn & trạng thái').click()
        dong.locator('text=Hiện lại lớp').click(); pg.wait_for_selector('.qt-thong-bao >> text=Đã hiện lại lớp', timeout=10000)
        kiem('hiện lại lớp', mot('select trang_thai from lop where id=%s', A)[0] == 'da-ban-giao')
        pg.click('.qt-o-so-nut:has-text("Đang hoạt động")')

        # Xóa hẳn lớp E (có 2 ảnh trên kho)
        so_file_truoc = len([k for k in FILES if E in k])
        dong = pg.locator('.qt-dong', has_text='Thương mại')
        dong.locator('text=Hạn & trạng thái').click(); dong.locator('text=Xóa hẳn lớp này…').click()
        dong.locator('input[id^=go-ma]').fill('eeeeex')
        kiem('gõ sai mã thì nút xóa bị khóa', dong.locator('button:has-text("Xóa vĩnh viễn")').is_disabled())
        dong.locator('input[id^=go-ma]').fill('EEEEEE')
        dong.locator('button:has-text("Xóa vĩnh viễn")').click(); pg.wait_for_selector('text=Đã xóa vĩnh viễn lớp', timeout=15000)
        kiem(f'xóa hẳn: hết dòng lớp, hết ảnh, hết {so_file_truoc} file trên kho',
             mot('select count(*) from lop where id=%s', E)[0] == 0 and mot('select count(*) from anh where lop_id=%s', E)[0] == 0
             and not [k for k in FILES if E in k] and so_file_truoc == 4)

        # Tạo lớp mới
        pg.click('.qt-nav >> text=Tạo lớp'); pg.wait_for_selector('#ten-lop', timeout=10000)
        mac_dinh = pg.input_value('#han-dung')
        kiem(f'hạn dùng mặc định 1 năm ({mac_dinh})', mac_dinh == f'{HOM_NAY.year + 1}-{HOM_NAY.month:02d}-{min(HOM_NAY.day, 28):02d}' or mac_dinh.startswith(str(HOM_NAY.year + 1)))
        pg.fill('#ten-lop', '9A'); pg.fill('#truong', 'THCS Ngô Sĩ Liên'); pg.fill('#tinh', 'Hà Nội')
        pg.fill('#bd', '2012'); pg.fill('#kt', '2016')
        pg.click('label:has-text("THCS")')
        pg.fill('#lt-ten-0', 'Đỗ Thu Trang'); pg.fill('#lt-sdt-0', '+84 966 777 888')
        pg.screenshot(path=f'{OUT}/qt3-tao-lop.png', full_page=True)
        pg.click('button:has-text("Tạo lớp")'); pg.wait_for_selector('text=Đã tạo lớp 9A', timeout=15000)
        moi = mot("select id, cap, het_han, (select count(*) from lop_truong lt where lt.lop_id = l.id) from lop l where ten_lop='9A'")
        kiem(f'lớp mới: cấp THCS, có hạn, 1 lớp trưởng → {moi[1:]}', moi[1] == 'thcs' and moi[2] is not None and moi[3] == 1)
        kiem('hiện mã PIN và tin nhắn Zalo', pg.locator('.qt-tin-nhan').count() == 1)

        # ===== Quản trị một lớp =====
        pg.goto(f'{BASE}/quan-tri/lop/{A}'); pg.wait_for_selector('.qt-tab.dang', timeout=10000)
        kiem('vào lớp mở tab Tổng quan', pg.url.endswith('/tong-quan') and 'Tổng quan' in pg.locator('.qt-tab.dang').inner_text())
        kiem('Tổng quan: tiến độ "3 thành viên", 2 lớp trưởng',
             pg.locator('.qt-ds-viec', has_text='3 thành viên').count() == 1 and pg.locator('.qt-ds-tv > li').count() == 2)
        pg.screenshot(path=f'{OUT}/qt4-lop-tong-quan.png', full_page=True)
        pg.click('.qt-tab:has-text("Thành viên")'); pg.wait_for_selector('text=Nguyễn Văn Hùng', timeout=10000)
        kiem('tab Thành viên & sơ đồ', pg.locator('.qt-so-do').count() == 1)
        pg.click('.qt-tab:has-text("Cài đặt")'); pg.wait_for_selector('#cd-truong', timeout=10000)
        pg.fill('#cd-truong', 'THPT Thanh Miện 2 (Hải Dương)'); pg.fill('#cd-ghi-chu', 'Đã cọc 500k')
        pg.click('text=Lưu thông tin'); pg.wait_for_selector('text=Đã lưu thông tin lớp', timeout=10000)
        kiem('sửa thông tin lớp: lưu DB và cập nhật đầu trang',
             mot('select truong, ghi_chu_noi_bo from lop where id=%s', A) == ('THPT Thanh Miện 2 (Hải Dương)', 'Đã cọc 500k')
             and 'Hải Dương)' in pg.locator('.qt-dau-lop h1').inner_text())
        pg.reload(); pg.wait_for_selector('#cd-truong', timeout=10000)
        kiem('tải lại trang vẫn đúng tab Cài đặt', pg.url.endswith('/cai-dat'))

        pg.goto(f'{BASE}/quan-tri/lop/{B}/anh'); pg.wait_for_selector('.qt-tab.dang', timeout=10000)
        kiem('tab Ảnh có số ảnh chờ', pg.locator('.qt-tab .qt-dem').inner_text().startswith('1'))
        pg.wait_for_selector('.qt-luoi-anh .qt-o-anh img', timeout=10000)
        pg.locator('.qt-luoi-anh .qt-o-anh').first.click(); pg.click('.qt-chi-tiet-anh >> button:has-text("Duyệt")')
        pg.wait_for_function("!document.querySelector('.qt-tab .qt-dem')", timeout=10000)
        kiem('duyệt xong, số ảnh chờ trên tab biến mất', mot("select trang_thai from anh where lop_id=%s", B)[0] == 'da-duyet')
        pg.screenshot(path=f'{OUT}/qt5-lop-anh.png', full_page=True)
        cx.close()

        # ===== Điện thoại =====
        cx = ctx_moi(390, 844); pg = cx.new_page(); pg.on('pageerror', lambda e: loi_js.append(str(e)))
        pg.goto(f'{BASE}/quan-tri'); pg.wait_for_selector('.qt-dong', timeout=15000)
        rong = pg.evaluate('document.documentElement.scrollWidth')
        kiem(f'điện thoại: không tràn ngang (rộng {rong})', rong <= 390)
        pg.screenshot(path=f'{OUT}/qt6-ds-dien-thoai.png', full_page=True)
        pg.goto(f'{BASE}/quan-tri/lop/{A}/tong-quan'); pg.wait_for_selector('.qt-tab.dang', timeout=10000)
        rong = pg.evaluate('document.documentElement.scrollWidth')
        kiem(f'điện thoại: trang lớp không tràn ngang (rộng {rong})', rong <= 390)
        pg.screenshot(path=f'{OUT}/qt7-lop-dien-thoai.png', full_page=False)
        cx.close()

        # ===== Tài khoản không phải quản trị =====
        cx = ctx_moi(1280, 800, TOKEN_LA, NGUOI_LA, 'nguoila@example.com'); pg = cx.new_page()
        pg.goto(f'{BASE}/quan-tri'); pg.wait_for_selector('text=Trang này dành cho người dựng trang', timeout=10000)
        kiem('người lạ không thấy danh sách lớp, không có menu', pg.locator('.qt-dong').count() == 0 and pg.locator('.qt-nav').count() == 0)
        cx.close()

        kiem('không có lỗi JavaScript', not loi_js)
        for e in loi_js: print('  JS:', e)
        b.close()
finally:
    srv.terminate()
for e in LOI: print('  HARNESS:', e)
print(f"\n{sum(r.startswith('OK') for r in kq)}/{len(kq)} đạt")
