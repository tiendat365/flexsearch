const express = require('express');
const cors = require('cors');
const FlexSearch = require('flexsearch');
const mongoose = require('mongoose');
require('dotenv').config(); // Tải các biến môi trường từ file .env

// === KHỞI TẠO ỨNG DỤNG EXPRESS ===
const app = express();
// Sử dụng PORT từ file .env hoặc mặc định là 5000
const PORT = process.env.PORT || 5000;

// === CẤU HÌNH MIDDLEWARE ===
app.use(cors());
app.use(express.json());

// === KẾT NỐI VỚI MONGODB ===
// Sử dụng chuỗi kết nối từ file .env
// === ĐỊNH NGHĨA CẤU TRÚC DỮ LIỆU (SCHEMA & MODEL) ===
const documentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true }
}, { timestamps: true }); // Thêm timestamps để biết khi nào tài liệu được tạo/cập nhật
const Document = mongoose.model('Document', documentSchema);

// === KHỞI TẠO INDEX CỦA FLEXSEARCH ===
const index = new FlexSearch.Document({
    document: {
        id: "_id",
        index: ["title", "content"]
    },
    tokenize: "full",
    encoder: 'icase'
});

// === HÀM ĐỒNG BỘ DỮ LIỆU TỪ DB VÀO INDEX ===
async function populateIndex() {
    try {
        console.log("🔄 Đang đồng bộ dữ liệu từ MongoDB vào Index...");
        const allDocs = await Document.find({});
        // Xóa index cũ trước khi thêm mới để tránh trùng lặp
        await index.clear();
        allDocs.forEach(doc => {
            index.add({ ...doc.toObject(), _id: doc._id.toString() });
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
        const query = req.query.q;
        if (!query) {
             return res.status(400).json({ error: "Thiếu tham số tìm kiếm 'q'" });
        }
        const searchResults = index.search(query, { enrich: true, limit: 10, fuzzy: 1 });
        const uniqueResults = {};
        searchResults.forEach(result => {
            result.result.forEach(doc => {
                uniqueResults[doc.id] = doc.doc;
            });
        });
        res.json(Object.values(uniqueResults));
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
        index.add({ ...newDoc.toObject(), _id: newDoc._id.toString() });
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

        index.update({ ...updatedDoc.toObject(), _id: updatedDoc._id.toString() });
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
        
        index.remove(req.params.id.toString());
        console.log(`🗑️ Đã xóa tài liệu ID "${req.params.id}" khỏi DB và Index.`);

    } catch (error) {
        console.error("Lỗi API Delete Document:", error);
        res.status(500).json({ error: "Lỗi máy chủ khi xóa tài liệu" });
    }
});

// === KHỞI ĐỘNG SERVER ===
async function startServer() {
    try {
        // 1. Kết nối tới MongoDB và CHỜ cho đến khi hoàn tất
        const dbURI = process.env.MONGODB_URI || "mongodb://localhost:27017/flexsearchDB";
        await mongoose.connect(dbURI);
        console.log('✅ Đã kết nối thành công với MongoDB!');

        // 2. Sau khi kết nối thành công, mới khởi động Express server
        app.listen(PORT, async () => {
            console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
            // 3. Đồng bộ dữ liệu vào FlexSearch index
            await populateIndex();
        });
    } catch (error) {
        console.error('❌ Không thể kết nối tới MongoDB. Server không thể khởi động.', error);
        process.exit(1); // Thoát ứng dụng nếu không kết nối được DB
    }
}

startServer();