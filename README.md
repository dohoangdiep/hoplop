# hoplop · thanhxuan.vn

Trang kỷ niệm họp lớp. Đặc tả đầy đủ: [CLAUDE.md](CLAUDE.md).

## Chạy thử trên máy
```
npm install
npm run dev
```
Mở http://localhost:5173 và http://localhost:5173/xemmau (lớp mẫu, thêm `?giao-dien=tuoi-sang` hoặc `thanh-lich`).

## Triển khai Cloudflare Pages
- Framework preset: Vite · Build command: `npm run build` · Output: `dist`
- Biến môi trường đã có sẵn trong `.env.production` (chỉ giá trị công khai).

## Database (Supabase)
Mở Supabase → SQL Editor, lần lượt dán nội dung từng file trong `supabase/migrations/` (0001, 0002, 0003…) theo đúng thứ tự, mỗi file bấm Run một lần.
