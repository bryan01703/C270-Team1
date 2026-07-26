const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'marketplace');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase();
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + safeExt);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext)) {
    return cb(null, true);
  }

  cb(new Error('Only PDF, DOC, DOCX, PPT, PPTX, TXT, PNG, JPG, and JPEG files are allowed.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isAdmin(req) {
  return req.session.user && req.session.user.role_type === 'Admin';
}

function ownsNote(req, note) {
  return Boolean(note) && Number(note.user_id) === Number(req.session.userId);
}

function canEditNote(req, note) {
  return ownsNote(req, note);
}

function canDeleteNote(req, note) {
  return Boolean(note) && (ownsNote(req, note) || isAdmin(req));
}

function cleanPrice(value) {
  const text = String(value || 'Free').trim();
  return text || 'Free';
}

function parsePrice(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === 'free') return 0;

  const parsed = Number.parseFloat(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function displayPrice(value) {
  const text = String(value || 'Free').trim();
  return text.toLowerCase() === 'free' ? 'Free' : '$' + escapeHtml(text);
}

function safeUploadedFileName(value) {
  if (!value) return '';
  return path.basename(String(value));
}


function renderPage(req, res, title, mainHtml, statusCode = 200) {
  req.app.render('partials/nav', { locals: { userId: req.session.userId } }, (err, navHtml) => {
    if (err) {
      console.error('Nav render error:', err.message);
      navHtml = '';
    }

    res.status(statusCode).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - StudyHub</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  ${navHtml}
  ${mainHtml}
</body>
</html>`);
  });
}

async function getNoteById(noteId) {
  const [rows] = await pool.execute(
    `SELECT n.*, u.username AS owner_username, u.full_name AS owner_name
     FROM marketplace_notes n
     JOIN users u ON n.user_id = u.user_id
     WHERE n.note_id = ?`,
    [noteId]
  );

  return rows[0] || null;
}

async function deleteAttachedFile(note) {
  const safeName = safeUploadedFileName(note && note.file_path);
  if (!safeName) return;

  const fullPath = path.join(uploadDir, safeName);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

function applyClientFilters(rows, req) {
  const search = String(req.query.search || '').trim().toLowerCase();
  const min = parsePrice(req.query.minPrice);
  const max = parsePrice(req.query.maxPrice);

  return rows.filter(note => {
    const searchMatches = !search ||
      String(note.title || '').toLowerCase().includes(search) ||
      String(note.module || '').toLowerCase().includes(search) ||
      String(note.description || '').toLowerCase().includes(search) ||
      String(note.owner_name || '').toLowerCase().includes(search) ||
      String(note.owner_username || '').toLowerCase().includes(search);

    const notePrice = parsePrice(note.price);
    const minMatches = !Number.isFinite(min) || (Number.isFinite(notePrice) && notePrice >= min);
    const maxMatches = !Number.isFinite(max) || (Number.isFinite(notePrice) && notePrice <= max);

    return searchMatches && minMatches && maxMatches;
  });
}

function getQueryMessage(req) {
  if (req.query.error === 'missing-fields') {
    return '<div class="alert alert-error">Title, module, and description are required.</div>';
  }

  if (req.query.error === 'upload') {
    return '<div class="alert alert-error">Upload failed. Check that the file type is allowed and under 10MB.</div>';
  }

  return '';
}

function renderIndex(req, res, notes, options = {}) {
  const search = escapeHtml(req.query.search || '');
  const minPrice = escapeHtml(req.query.minPrice || '');
  const maxPrice = escapeHtml(req.query.maxPrice || '');
  const errorHtml = options.error ? `<div class="alert alert-error">${escapeHtml(options.error)}</div>` : '';
  const successHtml = options.success ? `<div class="alert alert-success">${escapeHtml(options.success)}</div>` : '';
  const queryMessageHtml = getQueryMessage(req);

  const notesHtml = notes.length === 0
    ? '<p>No notes yet. Add one using the form above.</p>'
    : notes.map(note => renderNoteCard(req, note)).join('');

  renderPage(req, res, 'Marketplace', `
    <main style="max-width: 1100px;">
      <h1>Notes Marketplace</h1>
      <p class="helper-text mb-2">Share study notes with other StudyHub users. Students can edit and delete their own notes. Admins can delete any note.</p>

      ${errorHtml}
      ${successHtml}
      ${queryMessageHtml}

      <section class="card mb-2">
        <h2>Add a Note</h2>
        <form action="/marketplace/add" method="POST" enctype="multipart/form-data">
          <div class="form-group">
            <label for="title">Title</label>
            <input id="title" type="text" name="title" required>
          </div>

          <div class="form-group">
            <label for="module">Module</label>
            <input id="module" type="text" name="module" placeholder="e.g. C240" required>
          </div>

          <div class="form-group">
            <label for="price">Price</label>
            <input id="price" type="text" name="price" placeholder="Free or 5" value="Free" required>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" rows="4" required></textarea>
          </div>

          <div class="form-group">
            <label for="noteFile">Attach File</label>
            <input id="noteFile" type="file" name="noteFile" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg">
            <small class="helper-text">PDF, DOC, DOCX, PPT, PPTX, TXT, PNG, JPG, JPEG. Max 10MB.</small>
          </div>

          <button class="btn" type="submit">Add Note</button>
        </form>
      </section>

      <section class="card mb-2">
        <h2>Search &amp; Filter</h2>
        <form action="/marketplace" method="GET" style="display:grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; align-items:end;">
          <div class="form-group" style="margin-bottom:0;">
            <label for="search">Search</label>
            <input id="search" name="search" placeholder="Title, module, owner, or description" value="${search}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="minPrice">Min Price</label>
            <input id="minPrice" name="minPrice" type="number" min="0" step="0.01" value="${minPrice}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label for="maxPrice">Max Price</label>
            <input id="maxPrice" name="maxPrice" type="number" min="0" step="0.01" value="${maxPrice}">
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn" type="submit">Search</button>
            <a class="btn" href="/marketplace" style="background:#6b7280;">Clear</a>
          </div>
        </form>
      </section>

      <section class="card">
        <h2>Available Notes</h2>
        ${notesHtml}
      </section>
    </main>`);
}

function renderNoteCard(req, note) {
  const isOwner = ownsNote(req, note);
  const canDelete = canDeleteNote(req, note);
  const fileHtml = note.file_name && note.file_path
    ? `<p><strong>File:</strong> <a href="/marketplace/files/${encodeURIComponent(note.file_path)}">📎 ${escapeHtml(note.file_name)}</a></p>`
    : '';

  const editButton = isOwner
    ? `<a class="btn" href="/marketplace/edit/${encodeURIComponent(note.note_id)}">Edit</a>`
    : '';

  const deleteButton = canDelete
    ? `<form action="/marketplace/delete/${encodeURIComponent(note.note_id)}" method="POST" onsubmit="return confirm('Delete this note?');">
         <button class="btn btn-danger" type="submit">${isAdmin(req) && !isOwner ? 'Admin Delete' : 'Delete'}</button>
       </form>`
    : '';

  const actionHtml = (editButton || deleteButton)
    ? `<div style="display:flex; gap:0.5rem; margin-top:1rem;">${editButton}${deleteButton}</div>`
    : '';

  return `
    <div class="card" style="box-shadow:none; margin-bottom:1rem; background:#f8fafc;">
      <h3 style="margin-bottom:0.5rem;">${escapeHtml(note.title)}</h3>
      <p><strong>Module:</strong> ${escapeHtml(note.module)}</p>
      <p><strong>Owner:</strong> ${escapeHtml(note.owner_name)} (${escapeHtml(note.owner_username)})</p>
      <p><strong>Price:</strong> ${displayPrice(note.price)}</p>
      <p>${escapeHtml(note.description)}</p>
      ${fileHtml}
      ${actionHtml}
    </div>`;
}

function renderEdit(req, res, note) {
  const currentFileHtml = note.file_name && note.file_path
    ? `<p class="helper-text">Current file: <a href="/marketplace/files/${encodeURIComponent(note.file_path)}">${escapeHtml(note.file_name)}</a></p>`
    : '<p class="helper-text">No file attached yet.</p>';

  renderPage(req, res, 'Edit Marketplace Note', `
    <main>
      <h1>Edit Note</h1>

      <section class="card">
        <form action="/marketplace/edit/${encodeURIComponent(note.note_id)}" method="POST" enctype="multipart/form-data">
          <div class="form-group">
            <label for="title">Title</label>
            <input id="title" type="text" name="title" value="${escapeHtml(note.title)}" required>
          </div>

          <div class="form-group">
            <label for="module">Module</label>
            <input id="module" type="text" name="module" value="${escapeHtml(note.module)}" required>
          </div>

          <div class="form-group">
            <label for="price">Price</label>
            <input id="price" type="text" name="price" value="${escapeHtml(note.price || 'Free')}" required>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" rows="4" required>${escapeHtml(note.description)}</textarea>
          </div>

          <div class="form-group">
            <label for="noteFile">Replace File</label>
            ${currentFileHtml}
            <input id="noteFile" type="file" name="noteFile" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg">
            <small class="helper-text">Leave blank to keep the current file.</small>
          </div>

          <button class="btn" type="submit">Save Changes</button>
          <a class="btn" href="/marketplace" style="background:#6b7280;">Cancel</a>
        </form>
      </section>
    </main>`);
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT n.*, u.username AS owner_username, u.full_name AS owner_name
       FROM marketplace_notes n
       JOIN users u ON n.user_id = u.user_id
       ORDER BY n.created_at DESC`
    );

    renderIndex(req, res, applyClientFilters(rows, req));
  } catch (err) {
    console.error('Marketplace load error:', err.message);
    renderIndex(req, res, [], {
      error: 'Failed to load marketplace notes. Ensure the database schema is up to date (see database/init.sql).',
    });
  }
});

router.post('/add', requireAuth, upload.single('noteFile'), async (req, res) => {
  const title = String(req.body.title || '').trim();
  const module = String(req.body.module || '').trim();
  const price = cleanPrice(req.body.price);
  const description = String(req.body.description || '').trim();

  if (!title || !module || !description) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.redirect('/marketplace?error=missing-fields');
  }

  try {
    await pool.execute(
      `INSERT INTO marketplace_notes
       (user_id, title, description, module, price, file_name, file_path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        title,
        description,
        module,
        price,
        req.file ? req.file.originalname : null,
        req.file ? req.file.filename : null,
      ]
    );

    res.redirect('/marketplace');
  } catch (err) {
    console.error('Marketplace add error:', err.message);
    if (req.file) fs.unlinkSync(req.file.path);
    res.redirect('/marketplace');
  }
});

router.get('/edit/:id', requireAuth, async (req, res) => {
  try {
    const note = await getNoteById(req.params.id);
    if (!canEditNote(req, note)) return res.redirect('/marketplace');

    renderEdit(req, res, note);
  } catch (err) {
    console.error('Marketplace edit load error:', err.message);
    res.redirect('/marketplace');
  }
});

router.post('/edit/:id', requireAuth, upload.single('noteFile'), async (req, res) => {
  const title = String(req.body.title || '').trim();
  const module = String(req.body.module || '').trim();
  const price = cleanPrice(req.body.price);
  const description = String(req.body.description || '').trim();

  if (!title || !module || !description) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.redirect('/marketplace/edit/' + encodeURIComponent(req.params.id));
  }

  try {
    const note = await getNoteById(req.params.id);
    if (!canEditNote(req, note)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.redirect('/marketplace');
    }

    if (req.file) {
      await deleteAttachedFile(note);
      await pool.execute(
        `UPDATE marketplace_notes
         SET title = ?, description = ?, module = ?, price = ?, file_name = ?, file_path = ?
         WHERE note_id = ?`,
        [title, description, module, price, req.file.originalname, req.file.filename, req.params.id]
      );
    } else {
      await pool.execute(
        `UPDATE marketplace_notes
         SET title = ?, description = ?, module = ?, price = ?
         WHERE note_id = ?`,
        [title, description, module, price, req.params.id]
      );
    }

    res.redirect('/marketplace');
  } catch (err) {
    console.error('Marketplace edit save error:', err.message);
    if (req.file) fs.unlinkSync(req.file.path);
    res.redirect('/marketplace');
  }
});

router.post('/delete/:id', requireAuth, async (req, res) => {
  try {
    const note = await getNoteById(req.params.id);
    if (!canDeleteNote(req, note)) return res.redirect('/marketplace');

    await deleteAttachedFile(note);
    await pool.execute('DELETE FROM marketplace_notes WHERE note_id = ?', [req.params.id]);

    res.redirect('/marketplace');
  } catch (err) {
    console.error('Marketplace delete error:', err.message);
    res.redirect('/marketplace');
  }
});

router.get('/files/:filename', requireAuth, async (req, res) => {
  try {
    const safeName = safeUploadedFileName(req.params.filename);
    const [rows] = await pool.execute(
      'SELECT file_name, file_path FROM marketplace_notes WHERE file_path = ?',
      [safeName]
    );

    if (rows.length === 0) return res.redirect('/marketplace');

    const fullPath = path.join(uploadDir, safeName);
    if (!fs.existsSync(fullPath)) return res.redirect('/marketplace');

    res.download(fullPath, rows[0].file_name || safeName);
  } catch (err) {
    console.error('Marketplace file download error:', err.message);
    res.redirect('/marketplace');
  }
});

router.use((err, req, res, next) => {
  console.error('Marketplace upload error:', err.message);
  res.redirect('/marketplace?error=upload');
});

module.exports = router;
