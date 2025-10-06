const qEl = document.getElementById('q');
const resultsEl = document.getElementById('results');

let timeout = null;
qEl.addEventListener('input', () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => doSearch(qEl.value.trim()), 250);
});

async function doSearch(q) {
  if (!q) {
    resultsEl.innerHTML = '';
    return;
  }
  try {
    const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    renderResults(data.results);
  } catch (err) {
    resultsEl.innerHTML = '<div class="result">Lỗi khi gọi API</div>';
    console.error(err);
  }
}

function renderResults(results) {
  if (!results || results.length === 0) {
    resultsEl.innerHTML = '<div class="result">Không tìm thấy kết quả</div>';
    return;
  }
  resultsEl.innerHTML = results.map(r => `
    <div class="result">
      <div class="title">${escapeHtml(r.title)}</div>
      <div class="snippet">${escapeHtml(r.content.substring(0, 200))}</div>
    </div>
  `).join('');
}

function escapeHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
