const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const MODULE_FIELDS = ['class_codes_C237', 'class_codes_C270', 'class_codes_C304', 'class_codes_C218'];

function combineClassCodes(body) {
  return MODULE_FIELDS
    .map(function (f) { return body[f]; })
    .filter(function (v) { return v && v.trim(); })
    .join(',');
}

router.post('/auth/register', async (req, res) => {
  const { username, password, full_name, bio } = req.body;

  if (!username || !password || !full_name) {
    return res.render('register', {
      title: 'Sign Up',
      error: 'Username, password, and full name are required.',
    });
  }

  try {
    const [existing] = await pool.execute(
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      return res.render('register', {
        title: 'Sign Up',
        error: 'Username already taken. Please choose another.',
      });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const classCodesStr = combineClassCodes(req.body);

    const [result] = await pool.execute(
      `INSERT INTO users (username, password_hash, full_name, role_type, class_codes, bio)
      VALUES (?, ?, ?, 'Student', ?, ?)`,
      [username, password_hash, full_name, classCodesStr, bio || '']
    );

    const user = {
      user_id: result.insertId,
      username,
      full_name,
      role_type: 'Student',
      class_codes: classCodesStr,
      bio: bio || '',
    };

    req.session.userId = user.user_id;
    req.session.user = user;
    res.redirect('/profile');
  } catch (err) {
    console.error('Registration error:', err.message);
    res.render('register', {
      title: 'Sign Up',
      error: 'Registration failed. Please try again.',
    });
  }
});

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('login', {
      title: 'Log In',
      error: 'All fields are required.',
    });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.render('login', {
        title: 'Log In',
        error: 'Invalid username or password.',
      });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.render('login', {
        title: 'Log In',
        error: 'Invalid username or password.',
      });
    }

    req.session.userId = user.user_id;
    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role_type: user.role_type,
      class_codes: user.class_codes || '',
      bio: user.bio || '',
      created_at: user.created_at,
    };

    res.redirect('/profile');
  } catch (err) {
    console.error('Login error:', err.message);
    res.render('login', {
      title: 'Log In',
      error: 'Login failed. Please try again.',
    });
  }
});

router.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT user_id, username, full_name, role_type, class_codes, bio, created_at FROM users WHERE user_id = ?',
      [req.session.userId]
    );

    if (rows.length === 0) {
      req.session.destroy(() => res.redirect('/login'));
      return;
    }

    res.render('profile', { title: 'My Profile', user: rows[0] });
  } catch (err) {
    console.error('Profile fetch error:', err.message);
    res.redirect('/login');
  }
});

router.post('/profile', requireAuth, async (req, res) => {
  const { bio } = req.body;
  const role_type = req.session.user.role_type;

  try {
    const showCodes = role_type === 'Student' || role_type === 'Teacher';
    const classCodesStr = showCodes ? combineClassCodes(req.body) : '';

    await pool.execute(
      'UPDATE users SET class_codes = ?, bio = ? WHERE user_id = ?',
      [classCodesStr, bio || '', req.session.userId]
    );

    const [rows] = await pool.execute(
      'SELECT user_id, username, full_name, role_type, class_codes, bio, created_at FROM users WHERE user_id = ?',
      [req.session.userId]
    );

    req.session.user = rows[0];
    res.render('profile', {
      title: 'My Profile',
      user: rows[0],
      success: 'Profile updated successfully!',
    });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.render('profile', {
      title: 'My Profile',
      user: req.session.user,
      error: 'Failed to update profile.',
    });
  }
});

module.exports = router;
