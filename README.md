# 🔍 FlexSearch - Hệ Thống Tìm Kiếm Thông Minh & Phân Tán

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vietnamese](https://img.shields.io/badge/Language-Vietnamese-red.svg)](README.md)

Hệ thống tìm kiếm toàn văn **mạnh mẽ và phân tán** được xây dựng với **FlexSearch**, **Node.js**, **Express** và **MongoDB**. Hỗ trợ đầy đủ tiếng Việt với giao diện hiện đại, dashboard phân tán và lịch sử tìm kiếm thông minh.

---

## ✨ Tính Năng Chính

### 🔍 **Tìm Kiếm Thông Minh**
- 🚀 **Tìm kiếm siêu nhanh** với FlexSearch index
- 🇻🇳 **Hỗ trợ tiếng Việt** hoàn chỉnh với bộ lọc từ dừng
- 🎯 **Auto-complete** và gợi ý thông minh real-time
- 💡 **Highlight kết quả** với gradient đẹp mắt
- 🔧 **Fuzzy search** cho kết quả gần đúng
- ⚡ **Cache thông minh** với performance tối ưu

### � **Dashboard Phân Tán**
- ⚖️ **Bộ Cân Bằng Tải** - Theo dõi 3+ nodes real-time
- 🗄️ **Bộ Nhớ Cache Phân Tán** - Redis cluster simulation
- 📈 **Phân Tích Tìm Kiếm** - Thống kê từ khóa phổ biến
- ⚡ **Hiệu Suất Hệ Thống** - CPU, RAM, Disk I/O monitoring
- 📝 **Nhật Ký Real-time** - System logs tự động cập nhật

### 📚 **Lịch Sử Tìm Kiếm**
- 💾 **Lưu trữ thông minh** - Auto-save mọi tìm kiếm
- 📊 **Thống kê chi tiết** - Tổng số, từ khóa duy nhất, hôm nay
- 🔍 **Tìm trong lịch sử** - Search & filter mạnh mẽ
- 📥 **Xuất dữ liệu** - Export CSV cho phân tích
- 🗑️ **Quản lý linh hoạt** - Xóa từng mục hoặc tất cả

### 🎨 **Giao Diện Hiện Đại**
- 📱 **Responsive Design** - Hoạt động mượt trên mọi thiết bị
- 🌙 **Dark/Light Mode** - Chuyển đổi theme dễ dàng
- 🎭 **Tab System** - Tìm Kiếm | Lịch Sử | Dashboard
- ✨ **Animations** - Micro-interactions mượt mà
- 🎯 **Accessibility** - Hỗ trợ keyboard navigation

### � **API & Backend**
- 📄 **RESTful API** đầy đủ cho CRUD operations
- 🔄 **Auto-sync** index với MongoDB
- 🐳 **Docker Support** - Containerization ready
- ⚡ **Port Fallback** - Tự động tìm port available
- 🛡️ **Error Handling** - Robust error management

---

## 📋 Yêu cầu Hệ Thống

- **Node.js** >= 16.x
- **npm** hoặc **yarn**
- **MongoDB** >= 5.0
- **Docker** & **Docker Compose** (khuyến nghị)
- **RAM** >= 4GB (để chạy mượt các tính năng phân tán)

---

## 🚀 Cài Đặt & Chạy

### 🐳 **Cách 1: Sử dụng Docker (Khuyến nghị)**

```bash
# 1. Clone repository
git clone https://github.com/tiendat365/flexsearch.git
cd flexsearch

# 2. Khởi động MongoDB với Docker
docker-compose up -d

# 3. Cài đặt dependencies
npm install

# 4. Chạy server
npm start
```

### 💻 **Cách 2: MongoDB Local**

```bash
# 1. Clone repository
git clone https://github.com/tiendat365/flexsearch.git
cd flexsearch

# 2. Cài đặt và khởi động MongoDB local
# Ubuntu/Debian:
sudo systemctl start mongod

# macOS:
brew services start mongodb-community

# Windows: Khởi động MongoDB service

# 3. Cài đặt dependencies
npm install

# 4. Tạo file .env (tùy chọn)
echo "MONGODB_URI=mongodb://localhost:27017/flexsearch" > .env
echo "PORT=5000" >> .env

# 5. Chạy server
npm start
```

**Server sẽ chạy tại:** 
- 🌐 **Primary:** http://localhost:5000 
- 🔄 **Fallback:** Port tiếp theo nếu 5000 bận (5001, 5002, ...)

---

## 📱 Cách Sử Dụng

### 🔍 **Tab Tìm Kiếm**
1. Nhập từ khóa vào ô tìm kiếm
2. Xem gợi ý auto-complete real-time
3. Chọn kết quả hoặc nhấn Enter
4. Xem kết quả được highlight đẹp mắt

### 📚 **Tab Lịch Sử**
1. Xem tất cả tìm kiếm đã thực hiện
2. Lọc theo thời gian: Hôm nay, Tuần này, Tháng này
3. Tìm kiếm trong lịch sử
4. Sắp xếp: Mới nhất, Cũ nhất, Nhiều nhất, A-Z
5. Tìm lại nhanh hoặc xóa từng mục
6. Xuất file CSV để backup

### 📊 **Tab Dashboard**
1. **Bộ Cân Bằng Tải:** Theo dõi trạng thái 3 nodes
2. **Cache Phân Tán:** Xem hit ratio và memory usage
3. **Phân Tích Tìm Kiếm:** Từ khóa phổ biến, response time
4. **Hiệu Suất:** CPU, RAM, Disk I/O real-time
5. **Nhật Ký:** System logs tự động cập nhật

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │    Database     │
│                 │    │                  │    │                 │
│ • React-like    │◄──►│ • Node.js        │◄──►│ • MongoDB       │
│ • Auto-complete │    │ • Express.js     │    │ • FlexSearch    │
│ • Tab System    │    │ • FlexSearch     │    │ • Index Cache   │
│ • Dark Mode     │    │ • Load Balancer  │    │                 │
│ • Responsive    │    │ • Caching        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                ┌─────────────────▼──────────────────┐
                │         Distributed Features       │
                │                                    │
                │ • Load Balancing (3+ Nodes)       │
                │ • Redis Cluster Simulation        │
                │ • Real-time Monitoring            │
                │ • Performance Analytics           │
                │ • Auto-scaling Simulation         │
                └────────────────────────────────────┘
```

---

## 📂 Cấu Trúc Dự Án

### 📊 Truy cập các trang

- *Trang tìm kiếm chính*: http://localhost:5000
- *Dashboard báo cáo*: http://localhost:5000/dashboard

### Cách 2: Sử dụng MongoDB local

# 1. Đảm bảo MongoDB đang chạy trên máy
# Windows: Mở Services và start MongoDB
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env (optional)
# MONGODB_URI=mongodb://localhost:27017/flexsearchDB
# PORT=5000

# 4. Chạy server
npm start

### Chạy ở chế độ Development (auto-reload)

npm run dev

---

## 🏗️ Cấu trúc dự án

flexsearch/
├── src/
│   └── server.js           # Server chính, API endpoints
├── public/
│   ├── index.html          # Giao diện tìm kiếm
│   ├── dashboard.html      # Dashboard báo cáo (NEW!)
│   ├── data.js             # Script phía client
│   └── package.json        # Config cho public folder
├── data/
│   ├── documents.json      # Dữ liệu mẫu (tài liệu)
│   └── movies.json         # Dữ liệu mẫu (phim)
├── docker-compose.yml      # Cấu hình MongoDB container
├── package.json            # Dependencies và scripts
├── DASHBOARD_GUIDE.md      # Hướng dẫn sử dụng dashboard
└── README.md               # Tài liệu này

---

## 📡 API Endpoints

### 🔍 Tìm kiếm

*GET* /api/search

Query parameters:
- q - Tìm kiếm chung trên tất cả trường
- title - Tìm kiếm theo tiêu đề
- content - Tìm kiếm theo nội dung
- limit - Số lượng kết quả (mặc định: 10)
- fuzzy - Độ mờ (0-2, mặc định: 0)
- bool - Logic kết hợp: and hoặc or (mặc định: or)

Ví dụ:
# Tìm kiếm chung
curl "http://localhost:5000/api/search?q=javascript"

# Tìm theo tiêu đề với fuzzy search
curl "http://localhost:5000/api/search?title=node&fuzzy=1"

# Kết hợp nhiều điều kiện
curl "http://localhost:5000/api/search?title=javascript&content=async&bool=and&limit=5"

### 📄 Quản lý tài liệu

*GET* /api/documents - Lấy danh sách tài liệu (có phân trang)
curl "http://localhost:5000/api/documents?page=1&limit=10"

*POST* /api/documents - Thêm tài liệu mới
curl -X POST http://localhost:5000/api/documents \
  -H "Content-Type: application/json" \
  -d '{"title":"Tiêu đề mới","content":"Nội dung mới"}'

*PUT* /api/documents/:id - Cập nhật tài liệu
curl -X PUT http://localhost:5000/api/documents/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"title":"Tiêu đề đã sửa","content":"Nội dung đã sửa"}'

*DELETE* /api/documents/:id - Xóa tài liệu
curl -X DELETE http://localhost:5000/api/documents/507f1f77bcf86cd799439011

### 🏥 Health Check

*GET* /api/health - Kiểm tra trạng thái server và database
curl http://localhost:5000/api/health

### 📊 Dashboard API

*GET* /api/stats - Lấy thống kê cho dashboard
curl http://localhost:5000/api/stats

---

## 📊 Dashboard Báo cáo

Dashboard cung cấp giao diện trực quan để theo dõi và báo cáo dự án:

### 🎯 Các tính năng Dashboard

-*📈 Thống kê tổng quan**: Số lượng documents, searches, API calls
- *⏱️ Performance metrics*: Thời gian response, memory usage
-*🔍 Search analytics**: Top queries, search patterns
-*📋 Recent activities**: Hoạt động gần đây của hệ thống
-*🎨 Charts & Graphs**: Biểu đồ trực quan dễ hiểu

### 🚀 Truy cập Dashboard

1. Khởi động server: npm start
2. Mở trình duyệt: http://localhost:5000/dashboard
3. Xem thống kê real-time và reports

### 📋 Sử dụng cho báo cáo

Dashboard được thiết kế để hỗ trợ presentation và báo cáo:
- *Demo live*: Hiển thị trực tiếp trong buổi thuyết trình
- *Screenshots*: Capture màn hình cho slides/documents
- *Metrics export*: Xuất số liệu để phân tích
- *Performance showcase*: Chứng minh hiệu suất của hệ thống
📖 **Chi tiết**: Xem `DASHBOARD_GUIDE.md` để biết hướng dẫn sử dụng đầy đủ
ủ

---

## 🎨 Sử dụng giao diện web

1. Mở trình duyệt và truy cập http://localhost:5000
2. Nhập từ khóa vào ô tìm kiếm
3. Xem gợi ý auto-complete xuất hiện ngay khi gõ
4. Kết quả sẽ được highlight phần khớp với từ khóa

---

## ⚙️ Cấu hình

Tạo file .env trong thư mục gốc để tùy chỉnh:

env
# Cổng server
PORT=5000

# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/flexsearchDB

---

## 🔧 Chi tiết kỹ thuật

### FlexSearch Configuration

index = new FlexSearch.Document({
    document: {
        id: "_id",
        index: ["title", "content"],
        store: ["title", "content"]
    },
    filter: vietnameseStopwords,  // Lọc từ dừng tiếng Việt
    tokenize: "full"
});

### Database Schema

{
  title: String (required),
  content: String (required),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}

---

## 🐛 Xử lý sự cố

### MongoDB không kết nối được

# Kiểm tra MongoDB container
docker ps

# Xem logs
docker logs flexsearch_mongo_db

# Khởi động lại
docker-compose restart

### Port đã bị sử dụng

Server tự động tìm port khả dụng kế tiếp. Kiểm tra console output:
🚀 Server đang chạy tại http://localhost:5001


### Lỗi EADDRINUSE

# Windows - Tìm và dừng process đang dùng port
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9

---

## 🆕 Tính năng mới

### 📊 Dashboard Báo cáo
- *Real-time statistics*: Thống kê trực tiếp cho demo và presentation
- *Visual reports*: Biểu đồ và charts đẹp mắt cho báo cáo
- *Performance metrics*: Hiển thị hiệu suất hệ thống
- *Export capabilities*: Xuất dữ liệu để phân tích

### 💡 Highlight Search Results
- *Smart highlighting*: Tô sáng từ khóa trong kết quả tìm kiếm
- *Regex-based*: Sử dụng regex để highlight chính xác
- *Visual feedback*: Giúp user dễ dàng nhận diện kết quả

---

## 📊 Performance

- ✅ Index *26,787 tài liệu* trong < 1 giây
- ✅ Tìm kiếm phản hồi trong < 50ms
- ✅ Hỗ trợ hàng triệu documents với FlexSearch

---

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! 

1. Fork repository
2. Tạo branch mới (git checkout -b feature/AmazingFeature)
3. Commit changes (git commit -m 'Add some AmazingFeature')
4. Push to branch (git push origin feature/AmazingFeature)
5. Mở Pull Request

---

## 📝 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết

---

## 👨‍💻 Tác giả

*tiendat365*

- GitHub: [@tiendat365](https://github.com/tiendat365)
- Repository: [flexsearch](https://github.com/tiendat365/flexsearch)

---

## 🙏 Acknowledgments

- [FlexSearch](https://github.com/nextapps-de/flexsearch) - Thư viện tìm kiếm siêu nhanh
- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - NoSQL database
- [Mongoose](https://mongoosejs.com/) - MongoDB ODM

---

## 📚 Tài liệu tham khảo

- [FlexSearch Documentation](https://github.com/nextapps-de/flexsearch#documentation)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Node.js Docs](https://nodejs.org/docs/)

---
*Chúc bạn code vui vẻ! 🎉**
