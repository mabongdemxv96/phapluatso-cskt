# Thư mục tài liệu pháp lý của đơn vị

Đặt các tệp **PDF văn bản pháp luật gốc** vào thư mục này (giữ nguyên tên, không chỉnh sửa tệp).

Quy trình tự động áp dụng cho mỗi tệp:

1. **Lưu giữ nguyên trạng 100%**: tệp gốc nằm nguyên tại đây, website chỉ đọc, không ghi đè hay chuyển đổi. Người xem có thể tải đúng bản gốc về.
2. **Sách 3D lật trang**: website tự tạo một cuốn sách trên kệ 3D, hiển thị trực tiếp từng trang của chính file PDF gốc.
3. **Trích xuất toàn văn từng Điều**: website đọc lớp chữ của PDF, tách theo từng "Điều …" và nạp vào Thanh tìm kiếm kính lúp và bộ nhớ Trợ lý AI. Kết quả trích dẫn luôn là nguyên văn lấy từ file gốc, kèm số trang để đối chiếu.

## Cách thêm văn bản mới

- Chép file PDF vào thư mục này rồi commit và push lên GitHub (dùng GitHub Desktop hoặc nút *Add file → Upload files* trên trang GitHub).
- GitHub Action `Cập nhật danh mục văn bản` sẽ tự ghi tên file vào `danh-muc.json`, sau đó website tự nhận văn bản mới.
- Có thể sửa tay `danh-muc.json` để đặt tên hiển thị (`title`), số hiệu (`number`), chuyên đề (`category`: `hinh-su`, `doanh-nghiep`, `thue-tai-chinh`, `nghiep-vu`).

## Lưu ý về chất lượng trích xuất

- Cần PDF có **lớp chữ** (tải từ Công báo, vbpl.vn, thuvienphapluat…). PDF **ảnh chụp/scan** vẫn đọc được trong sách 3D, nhưng không trích xuất được chữ. Website sẽ gắn nhãn "PDF ảnh scan" để cán bộ biết cần thay bằng bản có lớp chữ.
- Kết quả trích xuất được lưu đệm trong trình duyệt. Khi file thay đổi (khác kích thước hoặc mã băm), website tự trích xuất lại.
