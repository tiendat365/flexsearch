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

// === HÀM HIGHLIGHT TỪ KHÓA ===
function highlightText(text, query) {
    if (!text || !query) return text;
    
    // Tạo regex để tìm từ khóa (case-insensitive)
    const words = query.trim().split(/\s+/);
    const pattern = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    
    // Wrap từ khóa với thẻ <mark>
    return text.replace(regex, '<mark>$1</mark>');
}

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
            tokenize: "forward",
            resolution: 9
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

// Hàm để highlight từ khóa tìm kiếm trong text
function highlightText(text, query) {
    if (!text || !query) return text;
    
    // Tạo regex để tìm từ khóa (case-insensitive)
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    
    // Thay thế từ khóa bằng version được bọc trong thẻ <b>
    return text.replace(regex, '<b>$1</b>');
}

// API Tìm kiếm (dùng Index)
app.get('/api/search', (req, res) => {
  try {
    const queryParams = req.query;
    const query = queryParams.q || queryParams.title || queryParams.content;
    
    if (!query) {
      return res.status(400).json({ error: "Vui lòng cung cấp tham số 'q' để tìm kiếm." });
    }

    const limit = parseInt(queryParams.limit) || 10;
    
    console.log("Searching for:", query);
    
    // Tìm kiếm đơn giản hơn - chỉ tìm trong title
    const searchResults = index.search(query, {
      field: "title",
      limit: limit,
      enrich: true
    });
    
    console.log("Search results count:", searchResults.length);
    
    // FlexSearch với enrich:true trả về [{field, result: [{id, doc}]}]
    let results = [];
    if (searchResults.length > 0 && searchResults[0].result) {
      results = searchResults[0].result.map(item => ({
        doc: item.doc,
        highlight: highlightText(item.doc.title, query)
      }));
    }
    
    console.log("Returning", results.length, "results");
    res.json(results);
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

// =====================================
// === DISTRIBUTED SYSTEM ENDPOINTS ===
// =====================================

// Dashboard metrics endpoint
app.get('/api/dashboard/metrics', (req, res) => {
    try {
        const metrics = {
            timestamp: new Date().toISOString(),
            loadBalancer: {
                activeNodes: 3,
                totalRequests: Math.floor(Math.random() * 10000) + 1000,
                strategy: 'vòng-quay',
                nodes: [
                    { name: 'Máy-1', status: 'hoạt-động', load: Math.floor(Math.random() * 40) + 30 },
                    { name: 'Máy-2', status: 'hoạt-động', load: Math.floor(Math.random() * 40) + 20 },
                    { name: 'Máy-3', status: 'hoạt-động', load: Math.floor(Math.random() * 40) + 15 }
                ]
            },
            cache: {
                hitRatio: Math.floor(Math.random() * 20) + 75,
                totalKeys: Math.floor(Math.random() * 5000) + 10000,
                memoryUsage: (Math.random() * 2 + 1.5).toFixed(1),
                performance: Math.floor(Math.random() * 30) + 70
            },
            search: {
                searchesPerMin: Math.floor(Math.random() * 40) + 20,
                avgResponseTime: Math.floor(Math.random() * 100) + 80,
                successRate: (Math.random() * 5 + 95).toFixed(1),
                popularQueries: [
                    { query: 'avatar', count: Math.floor(Math.random() * 50) + 100 },
                    { query: 'inception', count: Math.floor(Math.random() * 50) + 70 },
                    { query: 'marvel', count: Math.floor(Math.random() * 30) + 50 },
                    { query: 'chiến tranh sao', count: Math.floor(Math.random() * 40) + 45 },
                    { query: 'ma trận', count: Math.floor(Math.random() * 35) + 40 }
                ]
            },
            system: {
                cpuUsage: Math.floor(Math.random() * 40) + 20,
                ramUsage: Math.floor(Math.random() * 30) + 40,
                diskIO: Math.floor(Math.random() * 30) + 10,
                uptime: process.uptime()
            }
        };

        res.json(metrics);
    } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    try {
        const health = {
            status: 'khỏe-mạnh',
            timestamp: new Date().toISOString(),
            services: {
                database: mongoose.connection.readyState === 1 ? 'đã-kết-nối' : 'mất-kết-nối',
                search: index ? 'sẵn-sàng' : 'chưa-sẵn-sàng',
                loadBalancer: 'hoạt-động',
                cache: 'đã-kết-nối'
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
        };

        res.json(health);
    } catch (error) {
        console.error('Error in health check:', error);
        res.status(500).json({ 
            status: 'không-khỏe-mạnh',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// System logs endpoint
app.get('/api/logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const type = req.query.type || 'all';
        
        // Simulate log entries
        const logs = [];
        const types = ['info', 'warning', 'error', 'success'];
        const categories = ['LOAD_BALANCER', 'CACHE', 'SEARCH', 'HEALTH_CHECK', 'SYSTEM'];
        const messages = [
            'Yêu cầu được chuyển thành công',
            'Tỷ lệ cache trúng tối ưu',
            'Tìm kiếm hoàn thành thành công',
            'Tất cả máy chủ đang phản hồi bình thường',
            'Kích hoạt tự động mở rộng',
            'Phát hiện sử dụng bộ nhớ cao',
            'Hoàn thành làm mới cache',
            'Kiểm tra chuyển đổi dự phòng thành công'
        ];

        for (let i = 0; i < Math.min(limit, 20); i++) {
            const timestamp = new Date(Date.now() - i * 60000).toISOString();
            const logType = types[Math.floor(Math.random() * types.length)];
            const category = categories[Math.floor(Math.random() * categories.length)];
            const message = messages[Math.floor(Math.random() * messages.length)];

            if (type === 'all' || type === logType) {
                logs.push({
                    timestamp,
                    type: logType,
                    category,
                    message,
                    id: `log_${Date.now()}_${i}`
                });
            }
        }

        res.json({ logs, total: logs.length });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Node status endpoint
app.get('/api/nodes', (req, res) => {
    try {
        const nodes = [
            {
                id: 'node-1',
                name: 'Node-1 (Primary)',
                status: 'active',
                load: Math.floor(Math.random() * 40) + 30,
                memory: Math.floor(Math.random() * 30) + 50,
                cpu: Math.floor(Math.random() * 40) + 20,
                uptime: Math.floor(Math.random() * 86400) + 86400,
                requests: Math.floor(Math.random() * 1000) + 500,
                lastHeartbeat: new Date().toISOString()
            },
            {
                id: 'node-2',
                name: 'Node-2',
                status: 'active',
                load: Math.floor(Math.random() * 40) + 20,
                memory: Math.floor(Math.random() * 30) + 40,
                cpu: Math.floor(Math.random() * 40) + 15,
                uptime: Math.floor(Math.random() * 86400) + 86400,
                requests: Math.floor(Math.random() * 800) + 400,
                lastHeartbeat: new Date().toISOString()
            },
            {
                id: 'node-3',
                name: 'Node-3',
                status: 'active',
                load: Math.floor(Math.random() * 40) + 15,
                memory: Math.floor(Math.random() * 30) + 35,
                cpu: Math.floor(Math.random() * 40) + 10,
                uptime: Math.floor(Math.random() * 86400) + 86400,
                requests: Math.floor(Math.random() * 600) + 300,
                lastHeartbeat: new Date().toISOString()
            }
        ];

        res.json({ nodes, total: nodes.length });
    } catch (error) {
        console.error('Error fetching node status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Cache statistics endpoint
app.get('/api/cache/stats', (req, res) => {
    try {
        const stats = {
            timestamp: new Date().toISOString(),
            hitRatio: Math.floor(Math.random() * 20) + 75,
            missRatio: Math.floor(Math.random() * 25) + 5,
            totalKeys: Math.floor(Math.random() * 5000) + 10000,
            usedMemory: (Math.random() * 2 + 1.5).toFixed(1),
            maxMemory: '4.0',
            connections: Math.floor(Math.random() * 20) + 10,
            opsPerSecond: Math.floor(Math.random() * 1000) + 500,
            averageLatency: Math.floor(Math.random() * 10) + 2,
            keyspaces: [
                { name: 'search_cache', keys: Math.floor(Math.random() * 3000) + 5000 },
                { name: 'session_cache', keys: Math.floor(Math.random() * 1000) + 2000 },
                { name: 'analytics_cache', keys: Math.floor(Math.random() * 2000) + 3000 }
            ]
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching cache stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Performance metrics endpoint
app.get('/api/performance', (req, res) => {
    try {
        const interval = req.query.interval || '1h';
        const points = [];
        const pointCount = interval === '1h' ? 60 : interval === '24h' ? 24 : 12;
        
        for (let i = pointCount; i >= 0; i--) {
            const timestamp = new Date(Date.now() - i * 60000);
            points.push({
                timestamp: timestamp.toISOString(),
                cpu: Math.floor(Math.random() * 40) + 20,
                memory: Math.floor(Math.random() * 30) + 40,
                network: Math.floor(Math.random() * 100) + 50,
                disk: Math.floor(Math.random() * 50) + 10,
                requests: Math.floor(Math.random() * 100) + 50,
                responseTime: Math.floor(Math.random() * 50) + 80
            });
        }

        res.json({
            interval,
            points,
            summary: {
                avgCpu: points.reduce((sum, p) => sum + p.cpu, 0) / points.length,
                avgMemory: points.reduce((sum, p) => sum + p.memory, 0) / points.length,
                avgResponseTime: points.reduce((sum, p) => sum + p.responseTime, 0) / points.length,
                totalRequests: points.reduce((sum, p) => sum + p.requests, 0)
            }
        });
    } catch (error) {
        console.error('Error fetching performance metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
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