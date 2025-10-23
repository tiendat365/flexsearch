const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const mongoose = require('mongoose');
require('dotenv').config(); 
const FlexSearch = require('flexsearch');
// === KHỞI TẠO ỨNG DỤNG EXPRESS ===
const app = express();
// Sử dụng PORT từ file .env hoặc mặc định là 5000
const PORT = process.env.PORT || 5000;

// === CẤU HÌNH MIDDLEWARE ===
app.use(cors());
app.use(express.json());
// Phục vụ các tệp tĩnh (HTML, CSS, JS phía client) từ thư mục 'public'
app.use(express.static('public'));

// === KẾT NỐI VỚI MONGODB ===
// Sử dụng chuỗi kết nối từ file .env
// === ĐỊNH NGHĨA CẤU TRÚC DỮ LIỆU (SCHEMA & MODEL) ===
const documentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true }
}, { timestamps: true }); // Thêm timestamps để biết khi nào tài liệu được tạo/cập nhật
const Document = mongoose.model('Document', documentSchema);

// Danh sách các từ dừng phổ biến trong tiếng Việt
const vietnameseStopwords = [
    "và", "là", "của", "trong", "cho", "có", "được", "một", "khi", "từ",
    "đến", "với", "để", "các", "như", "này", "đã", "về", "thì", "ở"
];

// Khai báo index ở đây nhưng sẽ khởi tạo trong hàm populateIndex
let index;




// === HÀM ĐỒNG BỘ DỮ LIỆU TỪ DB VÀO INDEX ===
async function populateIndex() {
    try {
        console.log("🔄 Đang đồng bộ dữ liệu từ MongoDB vào Index...");
        // Khởi tạo một index mới, trống mỗi khi hàm này được gọi
        index = new FlexSearch.Document({
            document: {
                id: "_id",
                index: ["title", "content"],
                store: ["title", "content"]
            },
            filter: vietnameseStopwords,
            tokenize: "full"
        });

        const allDocs = await Document.find({});
        allDocs.forEach(doc => {
            // Sử dụng toJSON() thay vì toObject() để đảm bảo _id được chuyển thành chuỗi.
            // Điều này giúp FlexSearch xử lý ID một cách nhất quán và tránh các lỗi tiềm ẩn
            // liên quan đến kiểu dữ liệu ObjectId của Mongoose.
            // toJSON() cũng tự động chuyển đổi các kiểu dữ liệu khác như Date thành chuỗi ISO.
            index.add(doc.toJSON());
        });
        console.log(`✅ Đồng bộ thành công ${allDocs.length} tài liệu.`);
    } catch (error) {
        console.error("❌ Lỗi khi đồng bộ index:", error);
    }
}

// ===================================
// === ĐỊNH NGHĨA CÁC ĐƯỜNG DẪN API ===
// ===================================

// API Tìm kiếm (dùng Index)
app.get('/api/search', (req, res) => {
  try {
    const queryParams = req.query;
    const searchQueries = [];
    const searchOptions = {
      enrich: true,
      highlight: "<b>$1</b>",
      // Mặc định, kết hợp các điều kiện bằng AND
      // (kết quả phải khớp tất cả các trường được cung cấp)
      bool: "or" ,
      limit: 10000
    };

    // Tách các tham số truy vấn thành các điều kiện tìm kiếm và các tùy chọn
    for (const key in queryParams) {
      if (Object.prototype.hasOwnProperty.call(queryParams, key)) {
        const value = queryParams[key];
        // Các tham số đặc biệt để điều khiển tìm kiếm
        if (key === 'limit') {
          searchOptions.limit = parseInt(value, 10) || 10;
        } else if (key === 'fuzzy') {
          searchOptions.fuzzy = parseInt(value, 10) || 0;
        } else if (key === 'bool' && (value === 'and' || value === 'or')) {
          searchOptions.bool = value;
        } else if (key === 'q') { // Hỗ trợ tham số 'q' để tìm kiếm chung
          searchQueries.push({ field: ['title', 'content'], query: value });
        } else {
          // Các tham số khác được coi là tìm kiếm theo trường cụ thể
          searchQueries.push({ field: key, query: value });
        }
      }
    }

    if (searchQueries.length === 0) {
      return res.status(400).json({ error: "Vui lòng cung cấp ít nhất một tham số tìm kiếm (ví dụ: q, title, content)." });
    }

    const searchResults = index.search(searchQueries, searchOptions);

    // Gộp tất cả kết quả từ các field
    const mergedResults = searchResults.flatMap(r => r.result);

    // Loại bỏ trùng lặp theo _id
    const uniqueResults = Array.from(new Map(mergedResults.map(item => [item.doc._id, item])).values());

    // Trả về tất cả kết quả
    res.json(uniqueResults.map(item => ({
        doc: item.doc,
        highlight: item.highlight
    })));
    } catch (error) {
        console.error("Lỗi API Search:", error);
        res.status(500).json({ error: "Lỗi máy chủ khi tìm kiếm" });
    }
  });

// API Lấy tất cả tài liệu (CÓ PHÂN TRANG)
app.get('/api/documents', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const docs = await Document.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalDocuments = await Document.countDocuments();
        
        res.json({
            documents: docs,
            currentPage: page,
            totalPages: Math.ceil(totalDocuments / limit)
        });
    } catch (error) {
        console.error("Lỗi API Get Documents:", error);
        res.status(500).json({ error: "Lỗi máy chủ khi lấy tài liệu" });
    }
});

// API Thêm tài liệu
app.post('/api/documents', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: "Tiêu đề và nội dung là bắt buộc" });
        }
        const newDoc = new Document({ title, content });
        await newDoc.save();
        
        // Phản hồi cho người dùng ngay lập tức
        res.status(201).json(newDoc);
        
        // Cập nhật index trong nền
        index.add(newDoc.toJSON());
        console.log(`📝 Đã thêm tài liệu "${title}" vào DB và Index.`);

    } catch (error) {
        console.error("Lỗi API Add Document:", error);
        res.status(500).json({ error: "Lỗi máy chủ khi thêm tài liệu" });
    }
});

// API Cập nhật tài liệu
app.put('/api/documents/:id', async (req, res) => {
    try {
        const updatedDoc = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedDoc) {
            return res.status(404).json({ error: "Không tìm thấy tài liệu" });
        }
        
        res.json(updatedDoc);

        // Cập nhật index trong nền. Chỉ sử dụng toJSON() để đảm bảo tính nhất quán.
        index.update(updatedDoc.toJSON());
        console.log(`🔄 Đã cập nhật tài liệu "${updatedDoc.title}" trong DB và Index.`);

    } catch (error) {
        console.error("Lỗi API Update Document:", error);
        res.status(500).json({ error: "Lỗi máy chủ khi cập nhật tài liệu" });
    }
});

// API Xóa tài liệu
app.delete('/api/documents/:id', async (req, res) => {
    try {
        const deletedDoc = await Document.findByIdAndDelete(req.params.id);
        if (!deletedDoc) {
            return res.status(404).json({ error: "Không tìm thấy tài liệu" });
        }
        
        res.json({ message: "Xóa thành công" });
        
        index.remove(req.params.id);
        console.log(`🗑️ Đã xóa tài liệu ID "${req.params.id}" khỏi DB và Index.`);

    } catch (error) {
        console.error("Lỗi API Delete Document:", error);
        res.status(500).json({ error: "Lỗi máy chủ khi xóa tài liệu" });
    }
});

// API Kiểm tra "sức khỏe" của ứng dụng và DB
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const isConnected = dbState === 1;

    if (isConnected) {
        res.status(200).json({
            status: 'UP',
            db: 'connected'
        });
    } else {
        res.status(503).json({ // 503 Service Unavailable
            status: 'DOWN',
            db: `state: ${mongoose.STATES[dbState]}`
        });
    }
});
// === KHỞI ĐỘNG SERVER ===
async function startServer() {
    try {
       
        // 1. Kết nối tới MongoDB và CHỜ cho đến khi hoàn tất
        const dbURI = process.env.MONGODB_URI || "mongodb://localhost:27017/flexsearchDB";
        await mongoose.connect(dbURI);
        console.log('✅ Đã kết nối thành công với MongoDB!');

        // --- DEBUG: List all collections ---
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections found:', collections.map(c => c.name));
        // --- END DEBUG ---

        // 2. Thêm dữ liệu mẫu nếu cần
        // Tạm thời vô hiệu hóa việc tự động thêm dữ liệu khi khởi động
        // await seedDatabase();

        // 3. Đồng bộ dữ liệu vào FlexSearch index và CHỜ cho đến khi hoàn tất
        await populateIndex();

        // 4. CHỈ SAU KHI MỌI THỨ SẴN SÀNG, mới khởi động Express server
        const http = require('http');
        const server = http.createServer(app);
        const tryListen = (port) => {
            server.listen(port)
            .on('listening', () => {
                console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
            })
            .on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.warn(`⚠️ Cổng ${port} đang bận. Thử cổng ${port + 1}...`);
                    tryListen(port + 1);
                } else {
                    console.error('❌ Lỗi không mong muốn:', err);
                    process.exit(1);
                }
            });
        };
const initialPort = parseInt(process.env.PORT, 10) || 5000;
tryListen(initialPort);
    } catch (error) {
        console.error('❌ Không thể kết nối tới MongoDB. Server không thể khởi động.', error);
        process.exit(1); // Thoát ứng dụng nếu không kết nối được DB
    }
}

startServer();