const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { blockNonAdmin } = require('../middleware/auth');

router.use(blockNonAdmin);

const MODULE_FIELDS = [
  'class_codes_C218', 'class_codes_C240', 'class_codes_C245', 'class_codes_C246',
  'class_codes_C257', 'class_codes_C270', 'class_codes_C304', 'class_codes_C339',
  'class_codes_C346', 'class_codes_C390'
];

function combineClassCodes(body) {
  return MODULE_FIELDS
    .map(function (f) { return body[f]; })
    .filter(function (v) { return v && v.trim(); })
    .join(',');
}

async function getUsersByRole(roleType) {
  const [rows] = await pool.execute(
    'SELECT user_id, username, full_name, class_codes, bio, created_at FROM users WHERE role_type = ? ORDER BY created_at DESC',
    [roleType]
  );
  return rows;
}

async function getAllUsers() {
  const [rows] = await pool.execute(
    'SELECT user_id, username, full_name, role_type, class_codes, bio, created_at FROM users WHERE role_type IN (?, ?) ORDER BY role_type, created_at DESC',
    ['Student', 'Teacher']
  );
  return rows;
}

router.get('/dashboard', async (req, res) => {
  try {
    const allUsers = await getAllUsers();
    const students = allUsers.filter(function (u) { return u.role_type === 'Student'; });
    const teachers = allUsers.filter(function (u) { return u.role_type === 'Teacher'; });
    res.render('admin_dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      students: students,
      teachers: teachers,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err.message);
    res.render('admin_dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      students: [],
      teachers: [],
    });
  }
});

router.post('/create-teacher', async (req, res) => {
  const { username, password, full_name } = req.body;

  if (!username || !password || !full_name) {
    const allUsers = await getAllUsers();
    return res.render('admin_dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      students: allUsers.filter(function (u) { return u.role_type === 'Student'; }),
      teachers: allUsers.filter(function (u) { return u.role_type === 'Teacher'; }),
      error: 'Username, password, and full name are required.',
    });
  }

  try {
    const [existing] = await pool.execute(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      const allUsers = await getAllUsers();
      return res.render('admin_dashboard', {
        title: 'Admin Dashboard',
        user: req.session.user,
        students: allUsers.filter(function (u) { return u.role_type === 'Student'; }),
        teachers: allUsers.filter(function (u) { return u.role_type === 'Teacher'; }),
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

    const allUsers = await getAllUsers();
    res.render('admin_dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      students: allUsers.filter(function (u) { return u.role_type === 'Student'; }),
      teachers: allUsers.filter(function (u) { return u.role_type === 'Teacher'; }),
      success: 'Teacher account "' + username + '" created successfully!',
    });
  } catch (err) {
    console.error('Create teacher error:', err.message);
    const allUsers = await getAllUsers();
    res.render('admin_dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      students: allUsers.filter(function (u) { return u.role_type === 'Student'; }),
      teachers: allUsers.filter(function (u) { return u.role_type === 'Teacher'; }),
      error: 'Failed to create teacher account.',
    });
  }
});

router.post('/delete-user/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const [target] = await pool.execute(
      'SELECT user_id, role_type FROM users WHERE user_id = ?',
      [userId]
    );

    if (target.length === 0) {
      return res.redirect('/admin/dashboard');
    }

    if (target[0].role_type === 'Admin') {
      const allUsers = await getAllUsers();
      return res.render('admin_dashboard', {
        title: 'Admin Dashboard',
        user: req.session.user,
        students: allUsers.filter(function (u) { return u.role_type === 'Student'; }),
        teachers: allUsers.filter(function (u) { return u.role_type === 'Teacher'; }),
        error: 'Cannot delete an Admin account.',
      });
    }

    if (target[0].user_id === req.session.user.user_id) {
      const allUsers = await getAllUsers();
      return res.render('admin_dashboard', {
        title: 'Admin Dashboard',
        user: req.session.user,
        students: allUsers.filter(function (u) { return u.role_type === 'Student'; }),
        teachers: allUsers.filter(function (u) { return u.role_type === 'Teacher'; }),
        error: 'You cannot delete your own account.',
      });
    }

    await pool.execute('DELETE FROM users WHERE user_id = ?', [userId]);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.redirect('/admin/dashboard');
  }
});

router.post('/edit-user/:id', async (req, res) => {
  const userId = req.params.id;
  const { full_name, bio } = req.body;

  try {
    const classCodesStr = combineClassCodes(req.body);

    await pool.execute(
      'UPDATE users SET full_name = ?, bio = ?, class_codes = ? WHERE user_id = ?',
      [full_name || '', bio || '', classCodesStr, userId]
    );

    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Edit user error:', err.message);
    res.redirect('/admin/dashboard');
  }
});

module.exports = router;
