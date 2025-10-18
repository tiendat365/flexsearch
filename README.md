+
+### 2. Cấu hình môi trường
+
+Tạo một file tên là `.env` ở thư mục gốc của dự án và thêm nội dung sau. Đây là nơi bạn cấu hình cổng cho server và chuỗi kết nối tới MongoDB.
+
+```
+PORT=5501
+MONGODB_URI=mongodb://localhost:27017/flexsearchDB
+```
+
+### 3. Cài đặt các thư viện
+
+Mở terminal trong thư mục dự án và chạy lệnh sau:
+```bash
+npm install
+```
+
+---
+
+## 🏃‍♂️ Khởi chạy ứng dụng
+
+Ứng dụng gồm 2 phần (backend và frontend) cần được chạy song song.
+
+### 1. Chạy Backend (Server)
+
+Mở một terminal và chạy lệnh:
+```bash
+npm start
+```
+Bạn sẽ thấy thông báo server và database đã sẵn sàng. **Hãy giữ terminal này mở.**
+
+### 2. Chạy Frontend (Giao diện)
+
+Nếu bạn dùng Visual Studio Code, hãy cài extension **Live Server**.
+
+1. Mở một terminal **mới**.
+2. Chuột phải vào file `public/index.html`.
+3. Chọn `Open with Live Server`.
+
+Trình duyệt sẽ tự động mở và ứng dụng của bạn đã sẵn sàng để sử dụng!

# 🚀 Hướng dẫn Cài đặt và Chạy Dự án FlexSearch

Đây là hướng dẫn chi tiết từng bước để cài đặt và khởi chạy **ứng dụng tìm kiếm tài liệu FlexSearch**, nay đã được **nâng cấp để sử dụng cơ sở dữ liệu MongoDB**.

---

## ✅ Yêu cầu

Trước khi bắt đầu, hãy đảm bảo bạn đã cài đặt:

- **Node.js** (phiên bản `14.x` trở lên)  
- **npm** (thường được cài đặt sẵn cùng với Node.js)  
- **MongoDB** (được cài đặt và **đang chạy** trên máy của bạn)

---

## 🛠️ Các bước cài đặt

### 🔹 Bước 1: Chuẩn bị Thư mục và Tệp tin

1. **Tạo thư mục dự án**  
   Tạo một thư mục mới trên máy tính và đặt tên là:
