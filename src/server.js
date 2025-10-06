const path = require('path');
const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const { Index } = require('flexsearch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Load sample documents
const docsPath = path.join(__dirname, '..', 'data', 'documents.json');
let documents = [];
try {
  const raw = fs.readFileSync(docsPath, 'utf8');
  documents = JSON.parse(raw);
} catch (err) {
  console.error('Không thể đọc documents.json:', err.message);
}

// Build FlexSearch index (use default options to avoid runtime incompatibilities)
const index = new Index();

documents.forEach(doc => {
  try {
    index.add(doc.id, `${doc.title} \n ${doc.content}`);
  } catch (err) {
    console.error('Error indexing doc', doc.id, err && err.message);
  }
});

app.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ query: q, total: 0, results: [] });

  const ids = index.search(q, { limit: 100 });
  const results = ids.map(id => documents.find(d => d.id === id)).filter(Boolean);
  res.json({ query: q, total: results.length, results });
});

app.get('/docs', (req, res) => {
  res.json(documents);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
