# CÔNG TRÌNH THANH NIÊN: KHÔNG GIAN PHÁP LUẬT SỐ VÀ TRỢ LÝ AI HỎI ĐÁP, TRA CỨU VĂN BẢN PHÁP LUẬT

**Đơn vị chủ quản:** ĐOÀN CƠ SỞ PHÒNG CẢNH SÁT KINH TẾ – CÔNG AN TỈNH GIA LAI  
**Ý nghĩa:** Tiên phong thực hiện Nghị quyết số 57-NQ/TW của Bộ Chính trị về đột phá phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số.

---

## 🌟 TÍNH NĂNG NỔI BẬT

1. **Không gian Giá sách 3D (3D Bookshelf):**
   - Kệ sách gỗ số hóa trực quan với góc nhìn 3D chiều sâu và hiệu ứng ánh sáng.
   - Sách nổi bật với gáy 3D, bìa sách dập nổi viền vàng sang trọng.
   - Hiệu ứng tương tác: Rê chuột để sách nổi 3D; phân loại theo chuyên đề (Hình sự kinh tế, Doanh nghiệp, Thuế - Đấu thầu, Cẩm nang CSKT Gia Lai).
   - **Tải lên PDF trực tuyến:** Hỗ trợ nút tải file PDF hoặc kéo thả trực tiếp tệp PDF vào kệ sách để đọc ngay lập tức.

2. **Trình đọc sách 3D lật trang (3D Flipbook Reader):**
   - Lật trang 3D chân thực, mô phỏng cảm giác lật sách giấy thực tế.
   - Tích hợp âm thanh lật giấy sống động qua Web Audio API (chạy mượt mà, không phụ thuộc file âm thanh ngoài).
   - Thanh công cụ điều khiển: Phóng to/thu nhỏ (Zoom), chế độ toàn màn hình (Fullscreen), thanh trượt chọn trang tức thì, chuyển trang bằng phím mũi tên.

3. **Công cụ Tra cứu Điều luật thông minh:**
   - Tìm kiếm tức thời theo số điều luật (ví dụ: `Điều 188`, `Điều 200`, `Điều 201`, `Điều 324`...), tên tội danh hoặc từ khóa liên quan.
   - Tự động highlight từ khóa tìm kiếm.
   - Nút sao chép điều luật nhanh một chạm.
   - Nút **"Mở đọc trong Sách 3D"** chuyển thẳng đến trang chứa điều luật tương ứng.

4. **Trợ lý AI Hỏi đáp Pháp luật (Google Gemini API Free):**
   - Nhân cách hóa chuẩn mực người chiến sĩ CAND: Trợ lý Pháp luật số của Đoàn cơ sở Phòng Cảnh sát kinh tế – Công an tỉnh Gia Lai.
   - Hỗ trợ nhập mã Google Gemini API Key miễn phí (lưu an toàn trong trình duyệt người dùng qua `localStorage`).
   - Có sẵn chế độ trả lời chuyên sâu mẫu (Offline mode) ngay cả khi chưa nhập key.
   - Gợi ý các câu hỏi nhanh thường gặp về tội phạm kinh tế và Nghị quyết 57-NQ/TW.

5. **Linh vật Cảnh sát Chibi hướng dẫn:**
   - Hình ảnh Chibi Cảnh sát kinh tế Gia Lai trang trọng, thân thiện, mang sắc phục CAND và mũ kê-pi chuẩn mực.
   - Bóng thoại tương tác tự động gợi ý mẹo sử dụng cho người dùng.
   - Bấm vào Chibi để đổi các lời thoại và chỉ dẫn nghiệp vụ.

---

## 📥 QUY CHUẨN TẢI LÊN VĂN BẢN PHÁP LUẬT MỚI

Mỗi tệp PDF văn bản pháp luật đưa lên hệ thống đều được xử lý theo 3 bước:

1. **Lưu giữ nguyên trạng 100% tệp gốc**
   - Văn bản dùng chung: chép PDF vào thư mục [`tai-lieu-phap-ly/`](tai-lieu-phap-ly/) rồi đẩy lên GitHub. GitHub Action tự cập nhật `danh-muc.json`.
   - Văn bản cá nhân: bấm **"Tải văn bản PDF"** (hoặc kéo thả vào kệ sách). Tệp gốc được lưu nguyên khối trong trình duyệt của máy đó.
   - Mọi sách đều có nút tải về đúng tệp PDF gốc.
2. **Tự động tạo sách 3D lật trang** đọc trực tiếp từ chính file PDF gốc. Trên điện thoại sách hiển thị 1 trang mỗi lần và vuốt ngang để lật trang.
3. **Trích xuất toàn văn từng Điều** nạp vào Thanh tìm kiếm kính lúp và bộ nhớ Trợ lý AI:
   - Kết quả tìm kiếm hiển thị nguyên văn điều luật, kèm số trang và nút mở đúng trang trong sách 3D.
   - Trợ lý AI chỉ được dùng các điều luật truy xuất được làm căn cứ. Dưới mỗi câu trả lời, hệ thống tự gắn khung **"Căn cứ pháp lý – trích nguyên văn"** lấy thẳng từ văn bản gốc, không qua AI.

> PDF ảnh scan (không có lớp chữ) vẫn đọc được trong sách 3D nhưng không trích xuất được điều luật; hệ thống sẽ gắn nhãn "PDF ảnh scan".

---

## 🚀 HƯỚNG DẪN CHẠY VÀ SỬ DỤNG TRÊN MÁY TÍNH

### Cách 1: Chạy nhanh bằng file 1-click (Khuyên dùng)
- Nhấp đúp vào file `run_server.bat` trong thư mục này. Trình duyệt web sẽ tự động mở tại địa chỉ `http://localhost:8000`.

### Cách 2: Chạy bằng lệnh Python
Mở PowerShell hoặc Command Prompt tại thư mục dự án và chạy:
```powershell
python -m http.server 8000
```
Sau đó truy cập: `http://localhost:8000`

---

## 🌐 HƯỚNG DẪN ĐƯA LÊN WEBSITE CÔNG KHAI (HOSTING MIỄN PHÍ)

Website được xây dựng theo kiến trúc hiện đại, nhẹ nhàng, 100% tương thích với các nền tảng web tĩnh miễn phí hàng đầu:

### 1. Đưa lên GitHub Pages
1. Tạo một repository mới trên GitHub (ví dụ: `khong-gian-phap-luat-so-cskt-gialai`).
2. Tải toàn bộ mã nguồn của thư mục này lên GitHub.
3. Vào mục **Settings** -> **Pages** -> Chọn nhánh `main` (hoặc `master`) và lưu lại.
4. Website sẽ có đường link công khai: `https://[tên-tài-khoản].github.io/[tên-repo]/`.

### 2. Đưa lên Vercel / Netlify
1. Truy cập [vercel.com](https://vercel.com) hoặc [netlify.com](https://netlify.com).
2. Kéo thả trực tiếp thư mục dự án này vào để xuất bản trong 30 giây.
3. Hỗ trợ gắn tên miền riêng miễn phí (ví dụ: `phapluatso.csktgialai.gov.vn`).

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN

```
TUSACHDOANTHANHNIEN/
├── index.html                   # Giao diện chính của website
├── run_server.bat               # File khởi chạy web nhanh 1-click
├── context.md                   # Thông tin bối cảnh dự án
├── ke_hoach_trien_khai.md       # Kế hoạch các bước triển khai
├── css/
│   └── style.css                # CSS hiệu ứng 3D, animation, giá sách
├── js/
│   ├── app.js                   # Điều khiển chung toàn hệ thống
│   ├── data.js                  # Cơ sở dữ liệu sách, điều luật, prompt
│   ├── bookshelf.js             # Xử lý kệ sách 3D & upload PDF
│   ├── flipbook.js              # Trình đọc sách 3D lật trang chân thực
│   ├── search.js                # Module tra cứu điều luật nhanh
│   ├── chatbot.js               # Trợ lý AI hỏi đáp pháp luật
│   └── chibi.js                 # Mascot Cảnh sát Chibi tương tác
└── assets/
    ├── images/                  # Vector SVG huy hiệu CAND, Đoàn TN, Chibi
    └── docs/                    # Tài liệu PDF mẫu chuẩn hóa
```
