"""Mở trang vẽ bằng Chromium không giao diện, lưu ảnh vào public/trang-chu/.
Cần `npx vite --port 5179` đang chạy ở gốc kho."""
import base64, pathlib
from playwright.sync_api import sync_playwright

ra = pathlib.Path(__file__).resolve().parents[2] / 'public' / 'trang-chu'
ra.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto('http://localhost:5179/scripts/anh-trang-chu/index.html')
    pg.wait_for_function('window.veTatCa')
    anh = pg.evaluate('window.veTatCa()')
    for ten, url in anh.items():
        (ra / ten).write_bytes(base64.b64decode(url.split(',', 1)[1]))
        print(ten)
    b.close()
