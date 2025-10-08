// ==========================
// 📘 IMPORT CÁC THƯ VIỆN
// ==========================
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const { Document } = require('flexsearch'); // Dùng Document mode thay vì Index

// ==========================
// ⚙️ CẤU HÌNH CƠ BẢN
// ==========================
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware phục vụ logging và đọc JSON body
app.use(morgan('dev'));
app.use(express.json());

// Phục vụ file tĩnh cho giao diện web (public/index.html)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ==========================
// 📂 ĐỌC DỮ LIỆU TỪ FILE
// ==========================
const docsPath = path.join(__dirname, '..', 'data', 'documents.json');
let documents = [];

try {
  const raw = fs.readFileSync(docsPath, 'utf8');
  documents = JSON.parse(raw);
  console.log(`✅ Đã tải ${documents.length} tài liệu từ file.`);
} catch (err) {
  console.error('⚠️ Không thể đọc documents.json:', err.message);
}

// ==========================
// 🔍 KHỞI TẠO FLEXSEARCH INDEX
// ==========================
const index = new Document({
  document: {
    id: 'id',
    index: ['title', 'content'] // tìm kiếm theo tiêu đề và nội dung
  }
});

// Thêm dữ liệu vào index khi khởi động
documents.forEach(doc => {
  try {
    index.add(doc);
  } catch (err) {
    console.error('Lỗi khi index doc', doc.id, err.message);
  }
});

// ==========================
// 💾 HÀM TIỆN ÍCH: LƯU DỮ LIỆU RA FILE
// ==========================
function saveDocuments() {
  try {
    fs.writeFileSync(docsPath, JSON.stringify(documents, null, 2), 'utf8');
    console.log('💾 Đã lưu dữ liệu vào documents.json');
  } catch (err) {
    console.error('❌ Lỗi khi lưu dữ liệu:', err.message);
  }
}

// ==========================
// ⚡ CACHE KẾT QUẢ TÌM KIẾM
// ==========================
const cache = new Map(); // Map<query, result>

// ==========================
// 🚀 API: TÌM KIẾM TOÀN VĂN
// ==========================
app.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ query: q, total: 0, results: [] });

  // Trả kết quả từ cache nếu có
  if (cache.has(q)) {
    console.log(`⚡ Cache hit: "${q}"`);
    return res.json({ query: q, cached: true, ...cache.get(q) });
  }

  // Tìm kiếm theo FlexSearch
  const results = index.search(q, { enrich: true, limit: 100 });
  const merged = results.flatMap(r => r.result);
  const found = merged.map(id => documents.find(d => d.id === id)).filter(Boolean);

  const data = { total: found.length, results: found };
  cache.set(q, data);

  res.json({ query: q, cached: false, ...data });
});

// ==========================
// 📘 API: LẤY TOÀN BỘ TÀI LIỆU
// ==========================
app.get('/docs', (req, res) => {
  res.json({ total: documents.length, documents });
});

// ==========================
// ➕ API: THÊM TÀI LIỆU MỚI
// ==========================
app.post('/api/add', (req, res) => {
  const { id, title, content } = req.body;
  if (!id || !title || !content) {
    return res.status(400).json({ error: 'Thiếu id, title hoặc content' });
  }

  const exists = documents.find(d => d.id === id);
  if (exists) {
    return res.status(400).json({ error: 'ID đã tồn tại' });
  }

  const newDoc = { id, title, content };
  documents.push(newDoc);
  index.add(newDoc);
  saveDocuments();

  res.json({ message: '✅ Đã thêm tài liệu mới', data: newDoc });
});

// ==========================
// ✏️ API: CẬP NHẬT TÀI LIỆU
// ==========================
app.put('/api/update/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const doc = documents.find(d => d.id === id);
  if (!doc) return res.status(404).json({ error: 'Không tìm thấy tài liệu' });

  // Cập nhật dữ liệu
  doc.title = req.body.title || doc.title;
  doc.content = req.body.content || doc.content;
  index.update(id, doc);
  saveDocuments();

  res.json({ message: '🔄 Đã cập nhật tài liệu', data: doc });
});

// ==========================
// 🗑️ API: XÓA TÀI LIỆU
// ==========================
app.delete('/api/remove/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const found = documents.find(d => d.id === id);
  if (!found) return res.status(404).json({ error: 'Không tìm thấy tài liệu' });

  documents = documents.filter(d => d.id !== id);
  index.remove(id);
  saveDocuments();

  res.json({ message: `🗑️ Đã xóa tài liệu có id=${id}` });
});

// ==========================
// 📊 API: THỐNG KÊ HỆ THỐNG
// ==========================
app.get('/api/stats', (req, res) => {
  res.json({
    totalDocs: documents.length,
    memoryMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
    uptimeSec: process.uptime().toFixed(1),
    cacheSize: cache.size,
    indexType: index.constructor.name,
  });
});

// ==========================
// 🏠 TRANG CHỦ (GIAO DIỆN)
// ==========================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ==========================
// 🚀 KHỞI ĐỘNG SERVER
// ==========================
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại: http://localhost:${PORT}`);
});
