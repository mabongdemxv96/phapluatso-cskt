# KẾ HOẠCH TRIỂN KHAI DỰ ÁN
## CÔNG TRÌNH THANH NIÊN: “KHÔNG GIAN PHÁP LUẬT SỐ VÀ TRỢ LÝ AI HỎI ĐÁP, TRA CỨU VĂN BẢN PHÁP LUẬT”
**Đơn vị chủ quản:** Đoàn cơ sở Phòng Cảnh sát kinh tế – Công an tỉnh Gia Lai  
**Định hướng:** Tiên phong thực hiện Nghị quyết số 57-NQ/TW

---

### GIAI ĐOẠN 1: Chuẩn bị & Xác lập Kiến trúc Kỹ thuật (Foundation & Setup)
- [ ] **Bước 1.1: Thống nhất Tech Stack**
  - **Frontend:** React / Vite + TailwindCSS (tốc độ cao, linh hoạt, hiện đại).
  - **3D & Flipbook Engine:** HTML5 Canvas / `st-page-flip` kết hợp CSS 3D Transforms để tạo kệ sách 3D sống động và nhẹ máy.
  - **PDF Renderer:** `pdfjs-dist` (Mozilla PDF.js) để render trang PDF thành các trang lật 3D sắc nét.
  - **AI Engine:** Google Gemini 1.5 Flash API (gói miễn phí với hạn mức cao, phản hồi nhanh, tiếng Việt xuất sắc).
  - **Hosting:** Vercel / GitHub Pages / Cloudflare Pages (hoàn toàn miễn phí, tốc độ cao, hỗ trợ HTTPS tự động).
- [ ] **Bước 1.2: Khởi tạo Project & Cấu hình môi trường**
  - Khởi tạo thư mục mã nguồn với Vite + React + TailwindCSS.
  - Cấu hình bảng màu chuẩn:
    - *Xanh CAND:* `#003366` / `#0A2540`
    - *Xanh Đoàn Thanh niên:* `#0066CC` / `#0080FF`
    - *Vàng điểm xuyết (Huy hiệu/Sao vàng):* `#FFD700` / `#E5A823`
- [ ] **Bước 1.3: Chuẩn bị Assets nhận diện & Đồ họa**
  - Huy hiệu Công an nhân dân, Biểu trưng Đoàn TNCS Hồ Chí Minh.
  - Tiêu đề Công trình thanh niên (Nghị quyết 57-NQ/TW).
  - Bộ linh vật Cảnh sát Chibi (mascot) các biểu cảm: Chào mừng, Đang hướng dẫn, Tra cứu, Trợ lý AI.

---

### GIAI ĐOẠN 2: Thiết kế Giao diện (UI/UX) & Linh vật Chibi Hướng dẫn
- [ ] **Bước 2.1: Xây dựng Header & Hero Section**
  - Header trang trọng mang tên đơn vị: **ĐOÀN CƠ SỞ PHÒNG CẢNH SÁT KINH TẾ - CÔNG AN TỈNH GIA LAI**.
  - Khẩu hiệu hành động và định hướng Nghị quyết 57-NQ/TW về chuyển đổi số.
- [ ] **Bước 2.2: Thiết kế Linh vật Cảnh sát Chibi tương tác (Interactive Guide)**
  - Chibi xuất hiện ở góc màn hình hoặc các điểm chạm chính kèm lời thoại bóng bóng (Speech Bubble).
  - Lời thoại gợi ý: *"Chào đồng chí! Nhấn vào từng cuốn sách để mở đọc 3D nhé"*, *"Bạn cần tra cứu điều luật nào cứ nhập vào ô tìm kiếm..."*.
- [ ] **Bước 2.3: Phân khu Layout trên giao diện**
  - Khu 1: Kệ sách Pháp luật số 3D.
  - Khu 2: Thanh tìm kiếm & bộ lọc điều luật nhanh.
  - Khu 3: Cửa sổ Trợ lý AI hỏi đáp pháp luật.
  - Khu 4: Giới thiệu Đoàn cơ sở và liên hệ.

---

### GIAI ĐOẠN 3: Không gian Giá sách 3D & Trình đọc PDF Lật sách Thực tế
- [ ] **Bước 3.1: Dựng kệ sách 3D trực quan**
  - Hiển thị các ngăn kệ gỗ số hóa với góc nghiêng và ánh sáng 3D chiều sâu.
  - Phân loại sách theo chuyên đề:
    * *Bộ luật Hình sự & Tội phạm kinh tế*
    * *Luật Doanh nghiệp, Đầu tư, Đấu thầu*
    * *Luật Thuế, Tài chính, Ngân hàng*
    * *Cẩm nang Pháp luật & Phòng ngừa sai phạm*
- [ ] **Bước 3.2: Cơ chế Tải lên (Upload) & Quản lý file PDF**
  - Đóng gói sẵn các file tài liệu luật mẫu.
  - Cung cấp nút Tải lên (Upload) file PDF mới để đọc trực tuyến ngay lập tức.
- [ ] **Bước 3.3: Tích hợp Trình đọc sách lật 3D (Flipbook Reader)**
  - Hiệu ứng cong lật trang chân thực kèm âm thanh lật giấy sống động.
  - Hỗ trợ công cụ đọc: Phóng to/thu nhỏ (Zoom), chế độ toàn màn hình (Fullscreen), mục lục, thanh trượt trang.

---

### GIAI ĐOẠN 4: Chức năng Tra cứu & Tìm kiếm Điều luật Nhanh
- [ ] **Bước 4.1: Xây dựng cơ sở dữ liệu mẫu các điều luật trọng tâm**
  - Chuẩn bị dữ liệu JSON có cấu trúc: Tên văn bản, Chương, Mục, Điều, Khoản, Nội dung tóm tắt.
- [ ] **Bước 4.2: Xây dựng thanh Tìm kiếm thông minh**
  - Tìm kiếm tức thời theo từ khóa, số điều luật, tên hành vi kinh tế.
  - Tự động gợi ý từ khóa (Autocomplete).
- [ ] **Bước 4.3: Giao diện hiển thị chi tiết kết quả**
  - Highlight từ khóa, nút Copy điều luật, nút "Mở sách gốc".

---

### GIAI ĐOẠN 5: Trợ lý AI Hỏi đáp Pháp luật (Tích hợp API Miễn phí)
- [ ] **Bước 5.1: Xây dựng System Prompt chuyên ngành Cảnh sát kinh tế**
  - Thiết lập vai trò Trợ lý Pháp luật số của Đoàn CSKT Công an Gia Lai.
  - Đảm bảo câu trả lời chuẩn mực, chính xác, bám sát các điều khoản pháp luật Việt Nam.
- [ ] **Bước 5.2: Tích hợp API Gemini (Free Tier)**
  - Kết nối Gemini API miễn phí, hiển thị câu trả lời dạng gõ chữ (stream effect).
  - Cấu hình dự phòng / Caching các câu hỏi thường gặp để tối ưu tốc độ và quota.
- [ ] **Bước 5.3: Giao diện Khung Chat AI Chibi**
  - Khung chat đồng bộ mascot Chibi cảnh sát thân thiện.
  - Cung cấp các câu hỏi gợi ý nhanh (Quick Prompts) về pháp luật kinh tế thường gặp.

---

### GIAI ĐOẠN 6: Kiểm thử, Tối ưu & Đóng gói Triển khai Public
- [ ] **Bước 6.1: Kiểm thử toàn diện trên các thiết bị**
  - Kiểm tra độ tương thích trên Desktop, Máy tính bảng, Điện thoại di động.
  - Đảm bảo hiệu ứng 3D và đọc sách mượt mà, tốc độ tải nhanh.
- [ ] **Bước 6.2: Rà soát thẩm mỹ & Nhận diện thương hiệu**
  - Rà soát tính trang trọng, chính xác của biểu trưng CAND và Đoàn TN.
- [ ] **Bước 6.3: Đóng gói và Xuất bản**
  - Đóng gói bản build production.
  - Hướng dẫn đưa lên hosting miễn phí (Vercel / GitHub Pages) với tên miền công khai.
