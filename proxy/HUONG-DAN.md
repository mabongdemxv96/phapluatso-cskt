# Cài đặt proxy giấu khóa Gemini (Cloudflare Worker – miễn phí)

Website là trang tĩnh trên GitHub Pages, ai cũng xem được mã nguồn. Vì vậy khóa Gemini **không được** nằm trong mã website (khóa cũ đã bị Google khóa vì lý do này).
Proxy là một dịch vụ nhỏ trên Cloudflare: website gửi câu hỏi tới proxy, proxy dùng khóa bí mật để hỏi Gemini rồi trả câu trả lời về.

```
Trình duyệt người dùng ──► Cloudflare Worker (giữ khóa bí mật) ──► Google Gemini
```

Thời gian làm khoảng 10 phút. Gói miễn phí của Cloudflare cho 100.000 lượt gọi mỗi ngày.

## Bước 1: Tạo khóa Gemini mới

1. Vào https://aistudio.google.com và đăng nhập tài khoản Google.
2. Bấm **Get API key**, rồi **Create API key**.
3. Sao chép khóa (bắt đầu bằng `AIza...`). **Không dán khóa vào bất kỳ tệp nào của website.**
4. Nếu khóa cũ vẫn còn trong danh sách, bấm xóa khóa cũ.

## Bước 2: Tạo Worker trên Cloudflare

1. Đăng ký hoặc đăng nhập tại https://dash.cloudflare.com.
2. Vào menu **Compute (Workers)**, chọn **Workers & Pages**, bấm **Create**, rồi chọn **Start with Hello World!**.
3. Đặt tên, ví dụ `tro-ly-phap-luat`, rồi bấm **Deploy**.
4. Bấm **Edit code**. Xóa hết mã mẫu, dán toàn bộ nội dung tệp [`cloudflare-worker.js`](cloudflare-worker.js) vào, rồi bấm **Deploy**.

## Bước 3: Khai báo khóa bí mật và địa chỉ website được phép

Trong Worker vừa tạo, vào **Settings**, chọn **Variables and Secrets**, bấm **Add**:

| Loại | Tên biến | Giá trị |
|---|---|---|
| **Secret** | `GEMINI_API_KEY` | khóa `AIza...` ở Bước 1 |
| Text | `ALLOWED_ORIGINS` | `https://mabongdemxv96.github.io,http://localhost:8000` |

Bấm **Deploy** để lưu.

> `ALLOWED_ORIGINS` chỉ cho phép website của đơn vị gọi proxy, chặn người ngoài dùng ké.
> Nếu sau này dùng tên miền riêng, thêm tên miền đó vào danh sách, các địa chỉ cách nhau bằng dấu phẩy.

## Bước 4: Gắn địa chỉ Worker vào website

1. Sao chép địa chỉ Worker, có dạng `https://tro-ly-phap-luat.<tên-tài-khoản>.workers.dev`.
2. Mở tệp [`js/config.js`](../js/config.js) và điền địa chỉ đó:

   ```js
   window.CSKT_CONFIG = {
     aiProxyUrl: 'https://tro-ly-phap-luat.<tên-tài-khoản>.workers.dev'
   };
   ```

3. Commit và push lên GitHub. Địa chỉ Worker không phải bí mật, được phép để công khai.

## Kiểm tra

- Mở website, bấm **Trợ lý AI** và hỏi thử một câu.
- Nếu trợ lý báo "kết nối AI đang tạm gián đoạn", nhấn F12 và xem tab **Console** để biết lỗi:
  - `Website này chưa được phép…`: địa chỉ website chưa có trong `ALLOWED_ORIGINS`.
  - `Proxy chưa được cấu hình GEMINI_API_KEY`: chưa thêm biến bí mật ở Bước 3.
  - `API key not valid` / `leaked`: khóa sai hoặc đã bị khóa. Tạo khóa mới rồi cập nhật lại biến `GEMINI_API_KEY`.

## Giới hạn chống lạm dụng có sẵn trong proxy

- Tối đa 20 câu hỏi mỗi phút cho mỗi địa chỉ IP.
- Mỗi lần gửi tối đa 8 tin nhắn lịch sử, mỗi tin tối đa 2.000 ký tự.
- Câu trả lời tối đa 800 token, giúp tiết kiệm hạn mức miễn phí của Gemini.
