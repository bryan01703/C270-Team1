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
  const {
    module,
    priority,
    section
  } = req.query;

  // Loads announcements together with the current user's read status.
  let query = `
    SELECT
      a.*,
      u.full_name AS poster_name,
      u.role_type AS poster_role,
      CASE
        WHEN ar.user_id IS NULL THEN 0
        ELSE 1
      END AS is_read
    FROM announcements a
    JOIN users u
      ON a.created_by = u.user_id
    LEFT JOIN announcement_reads ar
      ON ar.announcement_id = a.announcement_id
     AND ar.user_id = ?
  `;

  const conditions = [];
  const params = [req.session.userId];

  // Filters announcements by module.
  if (module) {
    conditions.push('a.module_code = ?');
    params.push(module);
  }

  // Filters announcements by priority.
  if (priority) {
    conditions.push('a.priority = ?');
    params.push(priority);
  }

  // Filters announcements by class section.
  if (section) {
    conditions.push('a.class_section = ?');
    params.push(section);
  }

  // Adds filters to the SQL query.
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  // Shows newest announcements first.
  query += ' ORDER BY a.created_at DESC';

  try {
    // Gets announcements from MySQL.
    const [announcements] = await pool.execute(
      query,
      params
    );

    // Sends the announcements to the EJS page.
    res.render('announcements', {
      title: 'Announcement Feed',
      announcements,
      modules: MODULES,
      userRole: req.session.user
        ? req.session.user.role_type
        : 'Student',
      filters: {
        module: module || '',
        priority: priority || '',
        section: section || ''
      }
    });
  } catch (err) {
    // Handles database errors.
    console.error(
      'Fetch announcements error:',
      err.message
    );

    res.status(500).send(
      'Server Error loading announcement feed.'
    );
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

// Shows the announcement edit form.
router.get(
  '/announcements/:id/edit',
  requireAuth,
  checkRole(['Teacher', 'Admin']),
  async (req, res) => {
    try {
      const [announcements] = await pool.execute(
        `SELECT *
         FROM announcements
         WHERE announcement_id = ?`,
        [req.params.id]
      );

      if (announcements.length === 0) {
        return res.redirect('/announcements');
      }

      res.render('announcement_form', {
        title: 'Edit Announcement',
        modules: MODULES,
        announcement: announcements[0],
        isEdit: true,
        error: null
      });
    } catch (err) {
      console.error('Load announcement edit error:', err);
      res.redirect('/announcements');
    }
  }
);

// Updates an existing announcement in MySQL.
router.post(
  '/announcements/:id/edit',
  requireAuth,
  checkRole(['Teacher', 'Admin']),
  async (req, res) => {
    const {
      title,
      content,
      module_code,
      class_section,
      priority
    } = req.body;

    if (!title || !content || !module_code) {
      return res.redirect(
        `/announcements/${req.params.id}/edit`
      );
    }

    try {
      await pool.execute(
        `UPDATE announcements
         SET title = ?,
             content = ?,
             module_code = ?,
             class_section = ?,
             priority = ?
         WHERE announcement_id = ?`,
        [
          title.trim(),
          content.trim(),
          module_code,
          class_section || 'All',
          priority,
          req.params.id
        ]
      );

      await pool.execute(
        `INSERT INTO announcement_audit
         (announcement_id, action, performed_by, title_snapshot)
         VALUES (?, ?, ?, ?)`,
        [
          req.params.id,
          'EDIT',
          req.session.userId,
          title.trim()
        ]
      );

      res.redirect('/announcements');
    } catch (err) {
      console.error('Edit announcement error:', err);
      res.redirect('/announcements');
    }
  }
);

// Marks an announcement as read for the logged-in student.
router.post(
  '/announcements/:id/read',
  requireAuth,
  async (req, res) => {
    try {
      await pool.execute(
        `INSERT INTO announcement_reads
         (announcement_id, user_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE
           read_at = CURRENT_TIMESTAMP`,
        [
          req.params.id,
          req.session.userId
        ]
      );

      res.redirect('/announcements');
    } catch (err) {
      console.error('Mark announcement as read error:', err);
      res.redirect('/announcements');
    }
  }
);

module.exports = router;