const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { blockNonAdmin } = require('../middleware/auth');

router.use(blockNonAdmin);

const MODULE_FIELDS = ['class_codes_C237', 'class_codes_C270', 'class_codes_C304', 'class_codes_C218'];

function combineClassCodes(body) {
  return MODULE_FIELDS
    .map(function (f) { return body[f]; })
    .filter(function (v) { return v && v.trim(); })
    .join(',');
}

async function getTeachers() {
  const [rows] = await pool.execute(
    "SELECT user_id, username, full_name, class_codes, created_at FROM users WHERE role_type = 'Teacher' ORDER BY created_at DESC"
  );
  return rows;
}

router.get('/dashboard', async (req, res) => {
  try {
    const teachers = await getTeachers();
    res.render('admin_dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      teachers,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err.message);
    res.render('admin_dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      teachers: [],
    });
  }
});

router.post('/create-teacher', async (req, res) => {
  const { username, password, full_name } = req.body;

  if (!username || !password || !full_name) {
    const teachers = await getTeachers();
    return res.render('admin_dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      teachers,
      error: 'Username, password, and full name are required.',
    });
  }

  try {
    const [existing] = await pool.execute(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      const teachers = await getTeachers();
      return res.render('admin_dashboard', {
        title: 'Admin Dashboard',
        user: req.session.user,
        teachers,
        error: 'Username already taken.',
      });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const classCodesStr = combineClassCodes(req.body);

    await pool.execute(
      `INSERT INTO users (username, password_hash, full_name, role_type, class_codes, bio)
       VALUES (?, ?, ?, 'Teacher', ?, '')`,
      [username, password_hash, full_name, classCodesStr]
    );

    const teachers = await getTeachers();
    res.render('admin_dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      teachers,
      success: 'Teacher account "' + username + '" created successfully!',
    });
  } catch (err) {
    console.error('Create teacher error:', err.message);
    const teachers = await getTeachers();
    res.render('admin_dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      teachers,
      error: 'Failed to create teacher account.',
    });
  }
});

module.exports = router;
