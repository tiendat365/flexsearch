// ===============================
// 🔍 FlexSearch Frontend Script
// ===============================

// Lấy các phần tử giao diện
const qEl = document.getElementById('q');
const resultsEl = document.getElementById('results');
const statsEl = document.getElementById('stats');

// Gõ realtime (debounce 250ms)
let timeout = null;
qEl.addEventListener('input', () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => doSearch(qEl.value.trim()), 250);
});

// ===============================
// 🚀 Hàm tìm kiếm chính
// ===============================
async function doSearch(q) {
  if (!q) {
    resultsEl.innerHTML = '';
    statsEl.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    // Hiển thị số lượng kết quả
    statsEl.innerHTML = `<p><b>${data.total}</b> kết quả cho "<i>${escapeHtml(q)}</i>"</p>`;

    renderResults(data.results, q);
  } catch (err) {
    resultsEl.innerHTML = `<div class="result">⚠️ Lỗi khi gọi API</div>`;
    console.error(err);
  }
}

// ===============================
// 🧩 Hiển thị kết quả
// ===============================
function renderResults(results, query) {
  if (!results || results.length === 0) {
    resultsEl.innerHTML = '<div class="result">Không tìm thấy kết quả</div>';
    return;
  }

  resultsEl.innerHTML = results.map(r => `
    <div class="result">
      <div class="title">${highlight(r.title, query)}</div>
      <small>ID: ${r.id}</small>
      <div class="snippet">${highlight(escapeHtml(r.content.substring(0, 200)), query)}...</div>
      <div style="margin-top:8px;">
        <button onclick="editDoc(${r.id})">✏️ Sửa</button>
        <button onclick="deleteDoc(${r.id})">🗑️ Xóa</button>
      </div>
    </div>
  `).join('');
}

// ===============================
// 💡 Highlight từ khóa
// ===============================
function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===============================
// 🔒 Escape HTML
// ===============================
function escapeHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===============================
// ➕ Thêm tài liệu mới
// ===============================
async function addDoc() {
  const id = document.getElementById('id').value;
  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;

  if (!id || !title || !content) {
    alert('⚠️ Vui lòng nhập đầy đủ thông tin!');
    return;
  }

  try {
    const res = await fetch('/api/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title, content })
    });
    const data = await res.json();
    alert(data.message || data.error);
    clearForm();
    doSearch(qEl.value.trim());
  } catch (err) {
    console.error(err);
    alert('Lỗi khi thêm tài liệu');
  }
}

// ===============================
// ✏️ Sửa tài liệu
// ===============================
async function editDoc(id) {
  const newTitle = prompt('Nhập tiêu đề mới:');
  const newContent = prompt('Nhập nội dung mới:');
  if (!newTitle || !newContent) return;

  try {
    const res = await fetch(`/api/update/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, content: newContent })
    });
    const data = await res.json();
    alert(data.message || data.error);
    doSearch(qEl.value.trim());
  } catch (err) {
    console.error(err);
    alert('Lỗi khi sửa tài liệu');
  }
}

// ===============================
// 🗑️ Xóa tài liệu
// ===============================
async function deleteDoc(id) {
  if (!confirm('Xóa tài liệu này?')) return;

  try {
    const res = await fetch(`/api/remove/${id}`, { method: 'DELETE' });
    const data = await res.json();
    alert(data.message || data.error);
    doSearch(qEl.value.trim());
  } catch (err) {
    console.error(err);
    alert('Lỗi khi xóa tài liệu');
  }
}

// ===============================
// 🧹 Dọn form thêm mới
// ===============================
function clearForm() {
  document.getElementById('id').value = '';
  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
}

