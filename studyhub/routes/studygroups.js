const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// Keep this in sync with the module list used on profile.ejs / admin_dashboard.ejs
const MODULES = [
  { code: 'C218', name: 'UI/UX Design for Apps' },
  { code: 'C240', name: 'AI Essentials and Innovations' },
  { code: 'C245', name: 'Data Intelligence and Visualisation' },
  { code: 'C246', name: 'Data Analytics with GenAI' },
  { code: 'C257', name: 'Fundamentals of Design' },
  { code: 'C270', name: 'DevOps Essentials' },
  { code: 'C304', name: 'Cloud Application Development' },
  { code: 'C339', name: 'Software Testing and Analytics' },
  { code: 'C346', name: 'Mobile App Development' },
  { code: 'C390', name: 'Portfolio Development' },
];

async function fetchGroups(whereClause = '', params = []) {
  const [rows] = await pool.execute(
    `SELECT sg.*, u.full_name AS host_name, u.role_type AS host_role,
            (SELECT COUNT(*) FROM study_group_members m WHERE m.group_id = sg.group_id) AS member_count
     FROM study_groups sg
     JOIN users u ON sg.created_by = u.user_id
     ${whereClause}
     ORDER BY sg.session_date ASC, sg.session_time ASC`,
    params
  );
  return rows;
}

// Browse listings, optionally filtered by module and host role
router.get('/studygroups', requireAuth, async (req, res) => {
  const moduleFilter = req.query.module || '';
  const selectedRole = req.query.role || '';

  try {
    const conditions = [];
    const params = [];

    if (moduleFilter) {
      conditions.push('sg.module_code = ?');
      params.push(moduleFilter);
    }

    if (selectedRole) {
      conditions.push('u.role_type = ?');
      params.push(selectedRole);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const groups = await fetchGroups(where, params);

    const [joinedRows] = await pool.execute(
      'SELECT group_id FROM study_group_members WHERE user_id = ?',
      [req.session.userId]
    );
    const joinedIds = joinedRows.map(r => r.group_id);

    res.render('studyGroups', {
      title: 'Study Group Board',
      groups,
      modules: MODULES,
      selectedModule: moduleFilter,
      selectedRole, // ADDED: Send selectedRole to EJS
      joinedIds,
      userId: req.session.userId,
    });
  } catch (err) {
    console.error('Fetch study groups error:', err.message);
    res.render('studyGroups', {
      title: 'Study Group Board',
      groups: [],
      modules: MODULES,
      selectedModule: moduleFilter,
      selectedRole, // ADDED: Send selectedRole to error view
      joinedIds: [],
      userId: req.session.userId,
      error: 'Failed to load study groups.',
    });
  }
});

// Form to post a new session
router.get('/studygroups/new', requireAuth, (req, res) => {
  res.render('studygroup_form', {
    title: 'Post a Study Session',
    modules: MODULES,
  });
});

// Create a new session listing
router.post('/studygroups', requireAuth, async (req, res) => {
  const {
    group_name, module_code, session_date, session_time,
    location, session_link, description, max_slots,
  } = req.body;

  if (!group_name || !module_code || !session_date || !session_time || !location) {
    return res.render('studygroup_form', {
      title: 'Post a Study Session',
      modules: MODULES,
      error: 'Please fill in all required fields.',
      form: req.body,
    });
  }

  // Prevent past date
  const selectedDate = new Date(session_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison

  if (selectedDate < today) {
    return res.render('studygroup_form', {
      title: 'Post a Study Session',
      modules: MODULES,
      error: 'Session date cannot be in the past. Please select today or a future date.',
      form: req.body,
    });
  }

  try {
    await pool.execute(
      `INSERT INTO study_groups
        (group_name, module_code, session_date, session_time, location, session_link, description, max_slots, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        group_name, module_code, session_date, session_time, location,
        session_link || '', description || '',
        parseInt(max_slots, 10) || 4, req.session.userId,
      ]
    );
    res.redirect('/studygroups');
  } catch (err) {
    console.error('Create study group error:', err.message);
    res.render('studygroup_form', {
      title: 'Post a Study Session',
      modules: MODULES,
      error: 'Failed to create listing. Please try again.',
      form: req.body,
    });
  }
});

// View a single listing
router.get('/studygroups/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const groups = await fetchGroups('WHERE sg.group_id = ?', [id]);
    if (groups.length === 0) {
      return res.status(404).send('Study group not found');
    }
    const group = groups[0];

    const [members] = await pool.execute(
      `SELECT u.user_id, u.full_name
       FROM study_group_members m
       JOIN users u ON m.user_id = u.user_id
       WHERE m.group_id = ?
       ORDER BY m.joined_at ASC`,
      [id]
    );

    const isJoined = members.some(m => m.user_id === req.session.userId);
    const isHost = group.created_by === req.session.userId;
    const isAdmin = req.session.user.role_type === 'Admin';

    res.render('studygroup_details', {
      title: group.group_name,
      group,
      members,
      isJoined,
      isHost,
      canDelete: isHost || isAdmin,
    });
  } catch (err) {
    console.error('Fetch study group details error:', err.message);
    res.status(500).send('Failed to load study group.');
  }
});

// Edit study group page
router.get('/studygroups/:id/edit', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const groups = await fetchGroups('WHERE sg.group_id = ?', [id]);

    if (groups.length === 0) {
      return res.status(404).send('Study group not found');
    }

    const group = groups[0];

    const isHost = group.created_by === req.session.userId;
    const isAdmin = req.session.user.role_type === 'Admin';

    if (!isHost && !isAdmin) {
      return res.status(403).render('unauthorized', {
        title: 'Access Denied'
      });
    }

    res.render('studygroup_edit', {
      title: 'Edit Study Group',
      group,
      modules: MODULES
    });

  } catch (err) {
    console.error(err);
    res.redirect('/studygroups');
  }
});

// Join a session
router.post('/studygroups/:id/join', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const [groups] = await pool.execute('SELECT * FROM study_groups WHERE group_id = ?', [id]);
    if (groups.length === 0) return res.redirect('/studygroups');
    const group = groups[0];

    if (group.created_by === req.session.userId) {
      return res.redirect('/studygroups/' + id);
    }

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM study_group_members WHERE group_id = ?',
      [id]
    );
    if (countRows[0].cnt >= group.max_slots) {
      return res.redirect('/studygroups/' + id);
    }

    await pool.execute(
      'INSERT IGNORE INTO study_group_members (group_id, user_id) VALUES (?, ?)',
      [id, req.session.userId]
    );
    res.redirect('/studygroups/' + id);
  } catch (err) {
    console.error('Join study group error:', err.message);
    res.redirect('/studygroups/' + id);
  }
});

// Leave a session
router.post('/studygroups/:id/leave', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    await pool.execute(
      'DELETE FROM study_group_members WHERE group_id = ? AND user_id = ?',
      [id, req.session.userId]
    );
    res.redirect('/studygroups/' + id);
  } catch (err) {
    console.error('Leave study group error:', err.message);
    res.redirect('/studygroups/' + id);
  }
});

// Update study group
router.post('/studygroups/:id/edit', requireAuth, async (req, res) => {

  const id = parseInt(req.params.id, 10);

  const {
    group_name,
    module_code,
    session_date,
    session_time,
    location,
    session_link,
    description,
    max_slots
  } = req.body;

  try {

    const [rows] = await pool.execute(
      'SELECT created_by FROM study_groups WHERE group_id=?',
      [id]
    );

    if (rows.length === 0)
      return res.redirect('/studygroups');

    const isHost = rows[0].created_by === req.session.userId;
    const isAdmin = req.session.user.role_type === 'Admin';

    if (!isHost && !isAdmin) {
      return res.status(403).render('unauthorized', {
        title: 'Access Denied'
      });
    }

    await pool.execute(
      `UPDATE study_groups
       SET
         group_name=?,
         module_code=?,
         session_date=?,
         session_time=?,
         location=?,
         session_link=?,
         description=?,
         max_slots=?
       WHERE group_id=?`,
      [
        group_name,
        module_code,
        session_date,
        session_time,
        location,
        session_link,
        description,
        parseInt(max_slots, 10),
        id
      ]
    );

    res.redirect('/studygroups/' + id);

  } catch (err) {
    console.error(err);
    res.redirect('/studygroups');
  }

});

// Delete a listing (host or Admin only)
router.post('/studygroups/:id/delete', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const [groups] = await pool.execute('SELECT created_by FROM study_groups WHERE group_id = ?', [id]);
    if (groups.length === 0) return res.redirect('/studygroups');

    const isHost = groups[0].created_by === req.session.userId;
    const isAdmin = req.session.user.role_type === 'Admin';
    if (!isHost && !isAdmin) {
      return res.status(403).render('unauthorized', { title: 'Access Denied' });
    }

    await pool.execute('DELETE FROM study_groups WHERE group_id = ?', [id]);
    res.redirect('/studygroups');
  } catch (err) {
    console.error('Delete study group error:', err.message);
    res.redirect('/studygroups');
  }
});

module.exports = router;
