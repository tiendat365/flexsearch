const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
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

// === HÀM THÊM DỮ LIỆU MẪU (SEEDING) ===
async function seedDatabase() {
    try {
        const count = await Document.countDocuments();
        if (count === 0) {
            console.log('🌱 Cơ sở dữ liệu trống, đang thêm dữ liệu mẫu...');
            // Sử dụng import() động để tải ES Module từ CommonJS module.
            // Hàm này trả về một Promise, nên ta dùng await.
            const dataModule = await import('../public/data.js');
            const movieTitles = dataModule.default;

            // Chuyển đổi mỗi tiêu đề phim thành một document để lưu vào DB
            const sampleDocs = movieTitles.map(title => ({ title: title, content: title }));
            await Document.insertMany(sampleDocs);
            console.log(`✅ Đã thêm ${sampleDocs.length} phim mẫu từ data.js thành công.`);
        }
    } catch (error) {
        console.error('❌ Lỗi khi thêm dữ liệu mẫu:', error);
    }
}
// === HÀM ĐỒNG BỘ DỮ LIỆU TỪ DB VÀO INDEX ===
async function populateIndex() {
    try {
        console.log("🔄 Đang đồng bộ dữ liệu từ MongoDB vào Index...");
        // Khởi tạo một index mới, trống mỗi khi hàm này được gọi
        index = new FlexSearch.Document({
            document: {
                id: "_id",
                // Tăng trọng số cho tiêu đề
                index: [
                    {
                        field: "title",
                        boost: 2 // Ưu tiên kết quả ở tiêu đề gấp đôi
                    },
                    "content" // Giữ nguyên trọng số cho nội dung
                ]
            },
            filter: vietnameseStopwords,
            tokenize: "full",
            encoder: 'icase'
        });

        const allDocs = await Document.find({});
        allDocs.forEach(doc => {
            // FlexSearch Document sẽ tự động xử lý document từ Mongoose
            index.add(doc.toObject());
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
        // Thêm enrich: true để lấy toàn bộ document
        // Thêm highlight để Flexsearch tự động bọc các từ khóa khớp với tag <b>
        const searchResults = index.search(query, { 
            enrich: true, 
            limit: 10, 
            fuzzy: 1,
            highlight: "<b>$1</b>"
        });

        // FlexSearch với `enrich: true` thường trả về một mảng kết quả duy nhất trong `result[0]`.
        // Chúng ta có thể map trực tiếp qua nó để lấy document và highlight.
        const finalResults = searchResults[0]?.result.map(item => ({
            doc: item.doc,
            highlight: item.highlight
        })) || [];
        res.json(finalResults);
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
        // Tương tự, chỉ cần truyền document object
        index.add(newDoc.toObject());
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

        index.update(updatedDoc.toObject());
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

        // 2. Thêm dữ liệu mẫu nếu cần
        await seedDatabase();

        // 3. Đồng bộ dữ liệu vào FlexSearch index và CHỜ cho đến khi hoàn tất
        await populateIndex();

        // 4. CHỈ SAU KHI MỌI THỨ SẴN SÀNG, mới khởi động Express server
        app.listen(PORT, async () => {
            console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Không thể kết nối tới MongoDB. Server không thể khởi động.', error);
        process.exit(1); // Thoát ứng dụng nếu không kết nối được DB
    }
}

startServer();