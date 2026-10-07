"""
Chạy thử đầu-cuối: bản build thật trong Chromium, mọi gọi Supabase (RPC + Storage)
được chuyển tới Postgres cục bộ đã chạy 0001→0006, để kiểm logic SQL thật.
"""
import io, json, os, re, subprocess, sys, time, urllib.parse
import psycopg2
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

OUT = os.environ.get('THU_ANH', '/tmp/hoplop-thu-anh')
os.makedirs(OUT, exist_ok=True)
DSN = dict(host='/var/tmp/hoplop-pg', port=54329, user='postgres', dbname='hoplop')
SB = 'https://yjimrzkxhlfehxjygvpj.supabase.co'
LOP = '11111111-1111-1111-1111-111111111111'

def db():
    c = psycopg2.connect(**DSN); c.autocommit = True; return c

# ---------- dữ liệu mẫu ----------
with db() as c, c.cursor() as k:
    k.execute("""
    truncate lop cascade; truncate lan_sai_pin, phien_lop_truong, lan_nhap_sai;
    insert into auth.users(id) values ('00000000-0000-0000-0000-00000000000a') on conflict do nothing;
    insert into lop(id, ma, ten_goi, ten_lop, truong, nien_khoa_bat_dau, nien_khoa_ket_thuc, mat_khau_hash, giao_dien) values
      (%s, 'abcdef', 'a1-2006', '12A1', 'THPT Thanh Miện 2', 2003, 2006, crypt('hoaphuong482', gen_salt('bf')), 'hoai-niem');
    insert into so_do(lop_id) values (%s);
    insert into chuong(id, lop_id, ma_qr, tieu_de, ngay, dia_diem) values
      ('33333333-3333-3333-3333-333333333333', %s, 'qr1', 'Họp lớp 20 năm · Tết 2026', '2026-02-15', 'Nhà hàng Hoa Sen'),
      ('55555555-5555-5555-5555-555555555555', %s, 'qr9', 'Họp lớp 21 năm', '2027-02-10', null);
    insert into lop_truong(lop_id, ho_ten, sdt, pin_hash) values (%s, 'Nguyễn Thị Lan', '0912345678', crypt('123456', gen_salt('bf')));
    """, (LOP, LOP, LOP, LOP, LOP))

FILES = {}  # đường dẫn kho -> bytes

def png_mau(chu, mau):
    im = Image.new('RGB', (900, 650), mau); d = ImageDraw.Draw(im)
    d.rectangle([40, 40, 860, 610], outline=(255, 255, 255), width=8); d.text((80, 80), chu, fill=(255, 255, 255))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=85); return b.getvalue()

ANH_THU = []
for i, (chu, mau) in enumerate([('Cam trai 26/3', (90, 120, 80)), ('Van nghe 20/11', (140, 90, 70)), ('Ra choi', (70, 90, 140))]):
    p = f'{OUT}/thu{i}.jpg'; open(p, 'wb').write(png_mau(chu, mau)); ANH_THU.append(p)

def lit(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, list):
        return q('{' + ','.join('"%s"' % str(x).replace('"', '\\"') for x in v) + '}')
    return q(str(v))

def q(s): return "'" + s.replace("'", "''") + "'"

def chay_anon(sql, header_lt=None):
    with db() as c, c.cursor() as k:
        k.execute('set role anon')
        k.execute("select set_config('request.headers', %s, false)", (json.dumps({'x-hoplop-lt': header_lt} if header_lt else {}),))
        k.execute(sql); r = k.fetchone()[0] if k.description else None
        return r

LOI_RPC = []
REQS = []
def xu_ly(route, req):
    u = urllib.parse.urlparse(req.url); path = u.path
    REQS.append(req.method + ' ' + path[:90])
    hdr = {k.lower(): v for k, v in req.headers.items()}
    try:
        if path.startswith('/rest/v1/rpc/'):
            fn = path.rsplit('/', 1)[1]
            body = json.loads(req.post_data or '{}')
            args = ', '.join(f'{k} => {lit(v)}' for k, v in body.items())
            r = chay_anon(f'select to_jsonb(public.{fn}({args}))', hdr.get('x-hoplop-lt'))
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(r))
        m = re.match(r'/storage/v1/object/sign/anh$', path)
        if m and req.method == 'POST':
            body = json.loads(req.post_data)
            out = []
            for p in body['paths']:
                ok = chay_anon(f"select public.cho_phep_xem_anh({lit(p)})", hdr.get('x-hoplop-lt'))
                out.append({'path': p, 'signedURL': f'/object/sign/anh/{p}?token=t' if ok else None, 'error': None if ok else 'not found'})
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(out))
        m = re.match(r'/storage/v1/object/sign/anh/(.+)$', path)
        if m:
            b = FILES.get(urllib.parse.unquote(m.group(1)))
            return route.fulfill(status=200 if b else 404, content_type='image/jpeg', body=b or b'')
        m = re.match(r'/storage/v1/object/anh/(.+)$', path)
        if m and req.method == 'POST':
            p = urllib.parse.unquote(m.group(1))
            if not chay_anon(f"select public.cho_phep_tai_anh({lit(p)})"):
                return route.fulfill(status=403, content_type='application/json', body='{"statusCode":"403","error":"Unauthorized","message":"new row violates row-level security policy"}')
            raw = req.post_data_buffer
            i, j = raw.find(b'\xff\xd8'), raw.rfind(b'\xff\xd9')
            FILES[p] = raw[i:j + 2] if i >= 0 and j > i else raw
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'Key': 'anh/' + p, 'Id': p}))
        LOI_RPC.append(f'không giả lập: {req.method} {path}')
        return route.fulfill(status=404, body='')
    except Exception as e:
        LOI_RPC.append(f'{path}: {e}')
        return route.fulfill(status=400, content_type='application/json', body=json.dumps({'code': 'P0001', 'message': str(e)}))

srv = subprocess.Popen(['npx', 'vite', 'preview', '--port', '4173', '--strictPort'], cwd='/home/claude/hoplop',
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(4)
BASE = 'http://localhost:4173'
ket_qua = []
def kiem(ten, dk):
    ket_qua.append(('OK ' if dk else 'SAI') + ' ' + ten); print(ket_qua[-1], flush=True)

try:
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, locale='vi-VN')
        ctx.route(f'{SB}/**', xu_ly)
        ctx.on('request', lambda r: REQS.append('NET ' + r.url[:80]) if 'localhost' not in r.url and 'supabase' not in r.url else None)
        ctx.route('https://fonts.googleapis.com/**', lambda r, q: r.fulfill(status=200, content_type='text/css', body=''))
        pg = ctx.new_page()
        loi_js = []
        pg.on('pageerror', lambda e: loi_js.append(str(e)))

        # 1. Thành viên vào bằng mã lớp: không hỏi mật khẩu
        pg.goto(f'{BASE}/abcdef'); pg.wait_for_selector('text=Những lần gặp lại', timeout=10000)
        kiem('vào bằng mã lớp không cần mật khẩu', pg.locator('#mk-lop').count() == 0)
        kiem('thành viên không thấy thanh lớp trưởng', pg.locator('.thanh-lop-truong').count() == 0)

        # 2. Vào bằng tên gọi: hỏi mật khẩu
        pg.goto(f'{BASE}/a1-2006'); pg.wait_for_selector('#mk-lop', timeout=10000)
        kiem('vào bằng tên gọi thì hỏi mật khẩu', True)
        pg.fill('#mk-lop', 'sai-roi'); pg.click('text=Vào trang lớp'); pg.wait_for_selector('text=Mật khẩu chưa đúng')
        pg.fill('#mk-lop', 'hoaphuong482'); pg.click('text=Vào trang lớp'); pg.wait_for_selector('text=Những lần gặp lại', timeout=10000)
        kiem('mật khẩu đúng thì vào được', True)

        # 3. Trang gửi ảnh chung
        pg.goto(f'{BASE}/abcdef/gui-anh'); pg.wait_for_selector('text=Ảnh này chụp hồi nào?', timeout=10000)
        kiem('buổi tương lai không hiện để chọn', pg.locator('button.tab', has_text='Họp lớp 21 năm').count() == 0)
        kiem('buổi đã qua có trong danh sách', pg.locator('button.tab', has_text='Họp lớp 20 năm').count() == 1)
        pg.set_input_files('input[type=file]', ANH_THU[:2])
        pg.fill('#ten', 'Hùng Còi')
        pg.click('button.nut.chinh'); pg.wait_for_selector('#can-chon')
        kiem('chưa chọn "hồi nào" thì nhắc', True)
        pg.click('button.tab:has-text("Lớp 11")')
        pg.fill('#chu-thich', 'Hội trại 26/3')
        pg.screenshot(path=f'{OUT}/1-gui-anh-chon.png', full_page=True)
        pg.click('button.nut.chinh')
        try: pg.wait_for_selector('text=Đã gửi 2 ảnh', timeout=30000)
        except Exception:
            pg.screenshot(path=f'{OUT}/loi.png', full_page=True)
            print('FIGCAPTIONS:', pg.locator('figcaption').all_inner_texts(), 'STATUS:', pg.locator('[role=status]').all_inner_texts())
            print('HARNESS:', LOI_RPC[-10:]); print('REQS:', REQS[-15:]); raise
        pg.wait_for_selector('text=Ảnh bạn đã gửi', timeout=10000)
        kiem('ảnh thành viên vào hàng chờ, người gửi thấy đang chờ', pg.locator('text=Đang chờ duyệt').count() == 2)
        pg.screenshot(path=f'{OUT}/2-gui-anh-xong.png', full_page=True)

        # 4. QR buổi họp: chọn sẵn buổi; bật "luôn cần mật khẩu" vẫn gửi được qua QR
        with db() as c, c.cursor() as k: k.execute("update lop set luon_can_mat_khau = true where ma='abcdef'")
        pg2 = ctx.new_page(); pg2.goto(f'{BASE}/abcdef/q/qr1'); pg2.wait_for_selector('h1:has-text("Họp lớp 20 năm")', timeout=10000)
        kiem('QR chọn sẵn buổi họp', pg2.locator('button.tab[aria-pressed=true]', has_text='Họp lớp 20 năm').count() == 1)
        pg2.set_input_files('input[type=file]', ANH_THU[2:]); pg2.fill('#ten', 'Mai')
        pg2.click('button.nut.chinh'); pg2.wait_for_selector('text=Đã gửi 1 ảnh', timeout=30000)
        kiem('gửi qua QR khi lớp luôn cần mật khẩu', True)
        pg2.screenshot(path=f'{OUT}/3-qr-buoi-hop.png', full_page=True)
        pg2.goto(f'{BASE}/abcdef/gui-anh'); pg2.wait_for_selector('#mk', timeout=10000)
        kiem('không có QR thì hỏi mật khẩu khi bật công tắc', True)
        with db() as c, c.cursor() as k: k.execute("update lop set luon_can_mat_khau = false where ma='abcdef'")
        pg2.close()

        # 5. Lớp trưởng
        pg.goto(f'{BASE}/lop-truong'); pg.wait_for_selector('#sdt', timeout=10000)
        pg.fill('#sdt', '+84 912 345 678'); pg.fill('#pin', '111111'); pg.click('button:has-text("Đăng nhập")')
        pg.wait_for_selector('text=Còn 4 lần thử', timeout=10000)
        kiem('sai PIN báo còn 4 lần', True)
        pg.screenshot(path=f'{OUT}/4-dang-nhap-sai.png', full_page=True)
        pg.fill('#pin', '123456'); pg.click('button:has-text("Đăng nhập")')
        pg.wait_for_selector('text=Duyệt ảnh (3)', timeout=10000)
        kiem('một lớp thì vào thẳng, thấy 3 ảnh chờ', '/lop-truong/abcdef' in pg.url)
        pg.wait_for_selector('.lt-o-anh img', timeout=10000)
        kiem('lớp trưởng xem được ảnh đang chờ', pg.locator('.lt-o-anh img').count() == 3)
        pg.screenshot(path=f'{OUT}/5-lt-cho-duyet.png', full_page=True)
        pg.locator('.lt-o-anh').first.click()
        try: pg.wait_for_selector('.lt-xem img', timeout=8000)
        except Exception:
            pg.screenshot(path=f'{OUT}/loi.png'); print('XEM count', pg.locator('.lt-xem').count(), pg.locator('.lt-xem').first.inner_html()[:600] if pg.locator('.lt-xem').count() else ''); raise
        pg.screenshot(path=f'{OUT}/6-lt-xem-anh.png')
        pg.click('text=Duyệt, đưa lên trang'); pg.wait_for_selector('text=Duyệt ảnh (2)', timeout=10000)
        kiem('duyệt xong tự sang ảnh kế', pg.locator('.lt-xem').count() == 1)
        pg.click('text=Ẩn ảnh này'); pg.wait_for_selector('text=Duyệt ảnh (1)', timeout=10000)
        pg.locator('#noi-anh').select_option(label='Cắm trại'); pg.wait_for_selector('text=Đã chuyển ảnh', timeout=10000)
        pg.click('[aria-label="Đóng"]')
        pg.click('button.lt-tab:has-text("Đã ẩn")')
        pg.wait_for_selector('.lt-o-anh img', timeout=10000)
        kiem('ảnh đã ẩn vẫn hiện cho lớp trưởng (header token)', pg.locator('.lt-o-anh img').count() == 1)

        pg.click('text=Buổi họp & mã QR'); pg.click('text=Thêm buổi họp')
        pg.fill('#bh-td-moi', 'Tất niên 2027'); pg.fill('#bh-ng-moi', '2027-01-20'); pg.fill('#bh-dd-moi', 'Nhà hàng Sen Vàng')
        pg.click('.lt-form button:has-text("Lưu")'); pg.wait_for_selector('.lt-qr img', timeout=15000)
        kiem('tạo buổi họp xong hiện tờ QR', True)
        pg.screenshot(path=f'{OUT}/7-lt-buoi-hop-qr.png', full_page=True)

        # 6. Lớp trưởng xem trang lớp: thấy thanh lối tắt; gửi ảnh thì duyệt sẵn
        pg.goto(f'{BASE}/a1-2006'); pg.wait_for_selector('.thanh-lop-truong', timeout=10000)
        kiem('lớp trưởng vào bằng tên gọi không cần mật khẩu', pg.locator('#mk-lop').count() == 0)
        pg.screenshot(path=f'{OUT}/8-trang-lop-lt.png')
        pg.goto(f'{BASE}/abcdef/gui-anh'); pg.wait_for_selector('text=ảnh hiện lên trang lớp ngay', timeout=10000)
        kiem('tên lớp trưởng điền sẵn', pg.input_value('#ten') == 'Nguyễn Thị Lan')
        pg.set_input_files('input[type=file]', ANH_THU[:1]); pg.click('button.tab:has-text("Không nhớ rõ")')
        pg.click('button.nut.chinh'); pg.wait_for_selector('text=Ảnh đã lên trang lớp', timeout=30000)
        kiem('ảnh lớp trưởng gửi hiện ngay', True)

        # 7. Đăng xuất
        pg.goto(f'{BASE}/lop-truong/abcdef'); pg.wait_for_selector('text=Đăng xuất khỏi máy này', timeout=10000)
        pg.click('text=Đăng xuất khỏi máy này'); pg.wait_for_selector('#sdt', timeout=10000)
        kiem('đăng xuất về màn hình đăng nhập', True)

        # 8. Lớp mẫu: trang gửi ảnh vẫn mở (không gửi thật)
        pg.goto(f'{BASE}/xemmau/gui-anh'); pg.wait_for_selector('text=Ảnh này chụp hồi nào?', timeout=10000)
        kiem('lớp mẫu mở được trang gửi ảnh', True)

        # 9. Hộp thư thời gian đang tắt: không hiện trên trang lớp; ô Sắp họp lớp có nút gửi ảnh buổi đó
        pg.goto(f'{BASE}/abcdef'); pg.wait_for_selector('text=Những lần gặp lại', timeout=10000)
        kiem('Hộp thư thời gian đã ẩn', pg.locator('#thu').count() == 0 and pg.locator('text=Viết thư cho lớp').count() == 0)
        kiem('ô Sắp họp lớp có nút Gửi ảnh buổi này', pg.locator('.sap-hop a', has_text='Gửi ảnh buổi này').count() == 1)

        # 10. Link tên gọi cũ chuyển sang tên mới (vẫn hỏi mật khẩu)
        with db() as c, c.cursor() as k:
            k.execute("insert into ten_goi_cu(ten_goi, lop_id) values ('a1-2006', %s) on conflict do nothing; update lop set ten_goi = 'lop-12a1' where id = %s", (LOP, LOP))
        pg.evaluate("localStorage.clear()")
        pg.goto(f'{BASE}/a1-2006'); pg.wait_for_selector('#mk-lop', timeout=10000)
        kiem('link tên gọi cũ chuyển sang tên mới và hỏi mật khẩu', pg.url.endswith('/lop-12a1'))

        # 11. Lớp mẫu có thư mẫu
        pg.goto(f'{BASE}/xemmau'); pg.wait_for_selector('#tieu-de-thay-co', timeout=10000)
        kiem('lớp mẫu không còn khối thư', pg.locator('#thu').count() == 0)

        # 12. Tái hiện + Góc thầy cô (dữ liệu tạo thẳng trong DB, dùng ảnh đã tải lên ở trên)
        with db() as c, c.cursor() as k:
            k.execute("select id from anh where lop_id=%s and da_tai_xong order by tao_luc limit 3", (LOP,))
            ids = [r[0] for r in k.fetchall()]
            k.execute("update anh set trang_thai='da-duyet' where id = any(%s::uuid[])", (ids[:2],))
            k.execute("update anh set trang_thai='cho-duyet' where id = %s", (ids[2],))
            k.execute("insert into tai_hien(lop_id, anh_xua_id, anh_nay_id, chu_thich, nam_xua, nam_nay) values (%s,%s,%s,'Tháp người năm ấy',2005,2026), (%s,%s,%s,'Cặp này chưa duyệt ảnh nay',2005,2026)",
                      (LOP, ids[0], ids[1], LOP, ids[0], ids[2]))
            k.execute("insert into thay_co(lop_id, ho_ten, vai_tro, mon, cau_noi, anh_id) values (%s,'Cô Trần Thị Lan','Chủ nhiệm','Văn','Nhớ đường về lớp.',%s), (%s,'Thầy Nam',null,'Toán',null,null)", (LOP, ids[1], LOP))
        pg.goto(f'{BASE}/abcdef'); pg.wait_for_selector('#tieu-de-tai-hien', timeout=10000)
        pg.wait_for_selector('.cap-tai-hien img', timeout=10000)
        kiem('Tái hiện hiện cặp đủ ảnh đã duyệt, ẩn cặp chưa duyệt', pg.locator('.cap-tai-hien').count() == 1 and pg.locator('.cap-tai-hien img').count() == 2)
        kiem('Góc thầy cô hiện 2 thầy cô, dòng "Chủ nhiệm · dạy Văn"', pg.locator('.the-thay-co').count() == 2 and pg.locator('text=Chủ nhiệm · dạy Văn').count() == 1)
        pg.locator('.cap-tai-hien .nut-anh').first.click(); pg.wait_for_selector('.phong-to img', timeout=5000)
        kiem('bấm ảnh Tái hiện xem lớn được', True)
        pg.keyboard.press('Escape'); pg.locator('.phong-to').click(position={'x': 5, 'y': 5}) if pg.locator('.phong-to').count() else None
        pg.locator('#tieu-de-tai-hien').scroll_into_view_if_needed()
        pg.screenshot(path=f'{OUT}/10-tai-hien.png', full_page=False)
        pg.locator('#tieu-de-thay-co').scroll_into_view_if_needed()
        pg.screenshot(path=f'{OUT}/11-thay-co.png', full_page=False)
        pg.goto(f'{BASE}/xemmau'); pg.wait_for_selector('#tieu-de-thay-co', timeout=10000)
        kiem('lớp mẫu có Tái hiện và Góc thầy cô mẫu', pg.locator('.cap-tai-hien').count() == 1 and pg.locator('.the-thay-co').count() == 2)

        # 13. Lớp trưởng tự làm Tái hiện và Góc thầy cô
        with db() as c, c.cursor() as k:
            k.execute("delete from tai_hien; delete from thay_co; delete from lan_sai_pin")
        pg.goto(f'{BASE}/lop-truong'); pg.wait_for_selector('#sdt', timeout=10000)
        pg.fill('#sdt', '0912345678'); pg.fill('#pin', '123456'); pg.click('button:has-text("Đăng nhập")')
        pg.wait_for_selector('text=Tái hiện & thầy cô', timeout=10000)
        pg.click('text=Tái hiện & thầy cô'); pg.click('text=Thêm cặp ảnh')
        pg.locator('.lt-o-chon').nth(0).locator('text=Chọn ảnh của lớp').click()
        pg.wait_for_selector('.lt-chon-kho .lt-o-anh img', timeout=10000)
        pg.locator('.lt-chon-kho .lt-o-anh').first.click()
        pg.locator('.lt-o-chon').nth(1).locator('input[type=file]').set_input_files(ANH_THU[2])
        pg.wait_for_function("document.querySelectorAll('.lt-o-chon .lt-xem-chon img').length === 2", timeout=30000)
        pg.fill('#lt-th-nx-moi', '2005'); pg.fill('#lt-th-ct-moi', 'Tháp người, chụp lại năm nay')
        pg.screenshot(path=f'{OUT}/12-lt-tai-hien-form.png', full_page=True)
        pg.click('.lt-form button:has-text("Lưu")'); pg.wait_for_selector('text=Đã thêm cặp ảnh', timeout=15000)
        pg.wait_for_selector('.lt-cap-anh img >> nth=1', timeout=15000)
        kiem('lớp trưởng thêm được cặp Tái hiện (1 ảnh chọn, 1 ảnh tải mới)', pg.locator('.lt-cap-anh').count() == 2)
        pg.click('text=Thêm thầy cô')
        pg.fill('#lt-tc-ten-moi', 'Cô Trần Thị Lan'); pg.fill('#lt-tc-vt-moi', 'Chủ nhiệm'); pg.fill('#lt-tc-mon-moi', 'Văn')
        pg.fill('#lt-tc-cn-moi', '"Các em cứ đi xa, nhưng nhớ đường về lớp."')
        pg.locator('.lt-o-chon input[type=file]').set_input_files(ANH_THU[0])
        pg.wait_for_selector('.lt-o-chon .lt-xem-chon img', timeout=30000)
        pg.click('.lt-form button:has-text("Lưu")'); pg.wait_for_selector('text=Đã thêm vào Góc thầy cô', timeout=15000)
        pg.wait_for_selector('.lt-thay-co img', timeout=15000)
        kiem('lớp trưởng thêm được thầy cô có ảnh', pg.locator('.lt-thay-co img').count() == 1)
        pg.screenshot(path=f'{OUT}/13-lt-tab-them.png', full_page=True)
        with db() as c, c.cursor() as k:
            k.execute("select count(*) from anh where muc='chan-dung' and lop_id=%s and tao_luc > now() - interval '5 minutes'", (LOP,))
            kiem('ảnh tải mới thành ảnh riêng, không lẫn vào kho ảnh xưa', k.fetchone()[0] == 2)
        pg.goto(f'{BASE}/abcdef'); pg.wait_for_selector('.cap-tai-hien img', timeout=10000)
        kiem('trang lớp hiện cặp Tái hiện và thầy cô lớp trưởng vừa làm',
             pg.locator('.cap-tai-hien').count() == 1 and pg.locator('.the-thay-co', has_text='Cô Trần Thị Lan').count() == 1
             and pg.locator('.cau-thay-co', has_text='“Các em cứ đi xa').count() == 1)

        # 14. Lớp trưởng xóa hẳn ảnh
        with db() as c, c.cursor() as k:
            k.execute("delete from file_cho_xoa; select count(*) from anh where lop_id=%s and trang_thai='cho-duyet' and da_tai_xong", (LOP,))
            truoc = k.fetchone()[0]
        pg.goto(f'{BASE}/lop-truong/abcdef'); pg.wait_for_selector('.lt-o-anh', timeout=10000)
        pg.locator('.lt-o-anh').first.click(); pg.wait_for_selector('.lt-xem', timeout=5000)
        pg.once('dialog', lambda d: d.accept())
        pg.click('text=Xóa hẳn ảnh này'); pg.wait_for_selector('text=Đã xóa hẳn ảnh', timeout=10000)
        with db() as c, c.cursor() as k:
            k.execute("select count(*) from anh where lop_id=%s and trang_thai='cho-duyet' and da_tai_xong", (LOP,)); sau = k.fetchone()[0]
            k.execute("select count(*) from file_cho_xoa"); hang_doi = k.fetchone()[0]
        kiem('lớp trưởng xóa hẳn được ảnh, file vào hàng đợi dọn', sau == truoc - 1 and hang_doi == 2)

        # 15. Cấp học: lớp tiểu học hiện Lớp 1–5
        with db() as c, c.cursor() as k: k.execute("update lop set cap='tieu-hoc' where id=%s", (LOP,))
        pg.goto(f'{BASE}/abcdef/gui-anh'); pg.wait_for_selector('text=Ảnh này chụp hồi nào?', timeout=10000)
        nhan = pg.locator('.chon-hoi-nao .tab-hang').first.locator('button').all_inner_texts()
        kiem('lớp tiểu học: mục Lớp 1–5, không có Lớp 10–12', nhan[:5] == ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'] and 'Lớp 10' not in nhan)
        with db() as c, c.cursor() as k: k.execute("update lop set cap='dai-hoc' where id=%s", (LOP,))
        pg.goto(f'{BASE}/abcdef/gui-anh'); pg.wait_for_selector('text=Ảnh này chụp hồi nào?', timeout=10000)
        nhan = pg.locator('.chon-hoi-nao .tab-hang').first.locator('button').all_inner_texts()
        kiem('lớp đại học: Năm nhất…, có Lễ tốt nghiệp', nhan[0] == 'Năm nhất' and 'Lễ tốt nghiệp' in nhan)
        pg.screenshot(path=f'{OUT}/14-cap-dai-hoc.png')
        with db() as c, c.cursor() as k: k.execute("update lop set cap='thpt' where id=%s", (LOP,))

        kiem('không có lỗi JavaScript', not loi_js)
        for e in loi_js: print('  JS:', e)
        b.close()
finally:
    srv.terminate()

with db() as c, c.cursor() as k:
    k.execute("select string_agg(coalesce(muc, loai) || '/' || trang_thai || '/' || coalesce(nguoi_gui_ten,''), ', ' order by tao_luc) from anh")
    print('Ảnh trong DB:', k.fetchone()[0])
for e in LOI_RPC: print('  HARNESS:', e)
print(f"\n{sum(r.startswith('OK') for r in ket_qua)}/{len(ket_qua)} đạt")
