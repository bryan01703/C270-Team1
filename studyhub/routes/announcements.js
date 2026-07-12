const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, checkRole } = require('../middleware/auth');

// Synchronized with your team's module list
const MODULES = [
  { code: 'C237', name: 'Software Application Development' },
  { code: 'C270', name: 'DevOps Essentials' },
  { code: 'C304', name: 'Cloud Application Development' },
  { code: 'C218', name: 'UI/UX Design for Web & Mobile' },
];

// 1. BROWSE FEED (Accessible to all logged-in users)
router.get('/announcements', requireAuth, async (req, res) => {
  const { module, priority, section, sort } = req.query;
  
  let query = `
    SELECT a.*, u.full_name AS poster_name, u.role_type AS poster_role
    FROM announcements a
    JOIN users u ON a.created_by = u.user_id
  `;
  
  const conditions = [];
  const params = [];

  if (module) {
    conditions.push("a.module_code = ?");
    params.push(module);
  }
  if (priority) {
    conditions.push("a.priority = ?");
    params.push(priority);
  }
  if (section) {
    conditions.push("a.class_section = ?");
    params.push(section);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  // Sort by newest entries first
  query += " ORDER BY a.created_at DESC";

  try {
    const [announcements] = await pool.execute(query, params);
    
    res.render('announcements', {
      title: 'Announcement Feed',
      announcements,
      modules: MODULES,
      userRole: req.session.user ? req.session.user.role_type : 'Student', // Fallback safety
      filters: { module: module || '', priority: priority || '', section: section || '' }
    });
  } catch (err) {
    console.error('Fetch announcements error:', err.message);
    res.status(500).send('Server Error loading announcement feed.');
  }
});

// 2. RENDER NEW ANNOUNCEMENT FORM (Teachers & Admins Only)
router.get('/announcements/new', requireAuth, checkRole(['Teacher', 'Admin']), (req, res) => {
  res.render('announcement_form', {
    title: 'Post New Announcement',
    modules: MODULES,
    error: null
  });
});

// 3. CREATE NEW ANNOUNCEMENT (Teachers & Admins Only)
router.post('/announcements', requireAuth, checkRole(['Teacher', 'Admin']), async (req, res) => {
  const { title, content, module_code, class_section, priority } = req.body;

  if (!title || !content || !module_code) {
    return res.render('announcement_form', {
      title: 'Post New Announcement',
      modules: MODULES,
      error: 'Title, Content, and Module are required fields.',
    });
  }

  try {
    // uses the session user active ID to attribute who posted it
    const userId = req.session.userId || (req.session.user ? req.session.user.user_id : null);
    
    const [result] = await pool.execute(
      `INSERT INTO announcements (title, content, module_code, class_section, priority, created_by)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [title, content, module_code, class_section || 'All', priority || 'Normal', userId]
);

    await pool.execute(
      `INSERT INTO announcement_audit (announcement_id, action, performed_by, title_snapshot)
      VALUES (?, ?, ?, ?)`,
      [result.insertId, 'CREATE', userId, title]
);
res.redirect('/announcements');

  } catch (err) {
    console.error('Create announcement error:', err.message);
    res.status(500).send('Failed to post announcement.');
  }
});

// deleting announcements, Administrator/privileged acc only
router.post('/announcements/:id/delete', requireAuth, checkRole(['Teacher', 'Admin']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.session.userId || (req.session.user ? req.session.user.user_id : null);

  try {
    const [rows] = await pool.execute('SELECT title FROM announcements WHERE announcement_id = ?', [id]);

    if (rows.length > 0) {
      await pool.execute(
        `INSERT INTO announcement_audit (announcement_id, action, performed_by, title_snapshot)
        VALUES (?, ?, ?, ?)`,
        [id, 'DELETE', userId, rows[0].title]
      );
    }

    await pool.execute('DELETE FROM announcements WHERE announcement_id = ?', [id]);
    res.redirect('/announcements');
  } catch (err) {
    console.error('Delete announcement error:', err.message);
    res.redirect('/announcements');
  }
});

module.exports = router;