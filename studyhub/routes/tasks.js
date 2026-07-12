const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const VALID_MODULES = [
  { code: 'C218', name: 'UI/UX Design for Apps' },
  { code: 'C240', name: 'AI Essentials and Innovations' },
  { code: 'C245', name: 'Data Analytics with GenAI' },
  { code: 'C257', name: 'Fundamentals of Design' },
  { code: 'C270', name: 'DevOps Essentials' },
  { code: 'C304', name: 'Cloud Application Development' },
  { code: 'C339', name: 'Software Testing and Analytics' },
  { code: 'C346', name: 'Mobile App Development' },
  { code: 'C390', name: 'Portfolio Development' },
];

const VALID_STATUSES = ['Not Started', 'In Progress', 'Done'];
const VALID_TASK_TYPES = ['Assignment', 'Certification', 'To-Do', 'Quiz', 'Project'];
const VALID_DEADLINE_TYPES = ['Exam', 'Project', 'Assignment', 'Quiz', 'Other'];

function isValidModule(mod) {
  return VALID_MODULES.some(m => m.code === mod);
}

router.get('/tasks', requireAuth, async (req, res) => {
  try {
    const { status, module: modFilter } = req.query;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [req.session.userId];

    if (status && VALID_STATUSES.includes(status)) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (modFilter && isValidModule(modFilter)) {
      query += ' AND module = ?';
      params.push(modFilter);
    }

    query += ' ORDER BY due_date ASC';
    const [tasks] = await pool.execute(query, params);

    const [officialDeadlines] = await pool.execute(
      `SELECT od.*, u.full_name AS created_by_name
       FROM official_deadlines od
       JOIN users u ON od.created_by = u.user_id
       WHERE od.due_date >= ?
       ORDER BY od.due_date ASC`,
      [today.toISOString().split('T')[0]]
    );

    res.render('tasks/index', {
      title: 'My Tasks',
      tasks,
      officialDeadlines,
      VALID_MODULES,
      VALID_STATUSES,
      VALID_TASK_TYPES,
      VALID_DEADLINE_TYPES,
      userModules: VALID_MODULES,
      selectedStatus: status || '',
      selectedModule: modFilter || '',
      userRole: req.session.user.role_type,
    });
  } catch (err) {
    console.error('Tasks fetch error:', err.message);
    res.render('tasks/index', {
      title: 'My Tasks',
      tasks: [],
      officialDeadlines: [],
      VALID_MODULES,
      VALID_STATUSES,
      VALID_TASK_TYPES,
      VALID_DEADLINE_TYPES,
      userModules: VALID_MODULES,
      selectedStatus: '',
      selectedModule: '',
      userRole: req.session.user.role_type,
      error: 'Failed to load tasks.',
    });
  }
});

router.post('/tasks/add', requireAuth, async (req, res) => {
  const { title, module: mod, due_date, status, task_type } = req.body;
  const errors = [];

  if (!title || !title.trim()) errors.push('Task title is required.');
  if (title && title.trim().length > 100) errors.push('Title must be under 100 characters.');
  if (!mod || !isValidModule(mod)) errors.push('Please select a valid module.');
  if (!due_date) errors.push('Due date is required.');
  if (due_date) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(due_date) < today) errors.push('Due date cannot be in the past.');
  }
  if (!VALID_STATUSES.includes(status)) errors.push('Invalid status selected.');
  if (!VALID_TASK_TYPES.includes(task_type)) errors.push('Invalid task type selected.');

  if (errors.length > 0) {
    const [tasks] = await pool.execute(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC',
      [req.session.userId]
    );
    const [officialDeadlines] = await pool.execute(
      `SELECT od.*, u.full_name AS created_by_name FROM official_deadlines od
       JOIN users u ON od.created_by = u.user_id
       WHERE od.due_date >= ? ORDER BY od.due_date ASC`,
      [new Date().toISOString().split('T')[0]]
    );
    return res.render('tasks/index', {
      title: 'My Tasks',
      tasks,
      officialDeadlines,
      VALID_MODULES,
      VALID_STATUSES,
      VALID_TASK_TYPES,
      VALID_DEADLINE_TYPES,
      userModules: VALID_MODULES,
      selectedStatus: '',
      selectedModule: '',
      userRole: req.session.user.role_type,
      error: errors.join(' '),
      form: req.body,
    });
  }

  try {
    await pool.execute(
      'INSERT INTO tasks (user_id, title, module, due_date, status, task_type) VALUES (?, ?, ?, ?, ?, ?)',
      [req.session.userId, title.trim(), mod, due_date, status, task_type]
    );
    res.redirect('/tasks');
  } catch (err) {
    console.error('Add task error:', err.message);
    res.redirect('/tasks');
  }
});

router.get('/tasks/edit/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM tasks WHERE task_id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    if (rows.length === 0) return res.redirect('/tasks');

    res.render('tasks/edit', {
      title: 'Edit Task',
      task: rows[0],
      VALID_MODULES,
      VALID_STATUSES,
      VALID_TASK_TYPES,
    });
  } catch (err) {
    console.error('Edit task fetch error:', err.message);
    res.redirect('/tasks');
  }
});

router.post('/tasks/edit/:id', requireAuth, async (req, res) => {
  const { title, module: mod, due_date, status, task_type } = req.body;
  const errors = [];

  if (!title || !title.trim()) errors.push('Task title is required.');
  if (title && title.trim().length > 100) errors.push('Title must be under 100 characters.');
  if (!mod || !isValidModule(mod)) errors.push('Please select a valid module.');
  if (!due_date) errors.push('Due date is required.');
  if (!VALID_STATUSES.includes(status)) errors.push('Invalid status selected.');
  if (!VALID_TASK_TYPES.includes(task_type)) errors.push('Invalid task type selected.');

  if (errors.length > 0) {
    const [rows] = await pool.execute(
      'SELECT * FROM tasks WHERE task_id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    return res.render('tasks/edit', {
      title: 'Edit Task',
      task: { ...rows[0], ...req.body },
      VALID_MODULES,
      VALID_STATUSES,
      VALID_TASK_TYPES,
      error: errors.join(' '),
    });
  }

  try {
    await pool.execute(
      'UPDATE tasks SET title = ?, module = ?, due_date = ?, status = ?, task_type = ? WHERE task_id = ? AND user_id = ?',
      [title.trim(), mod, due_date, status, task_type, req.params.id, req.session.userId]
    );
    res.redirect('/tasks');
  } catch (err) {
    console.error('Edit task error:', err.message);
    res.redirect('/tasks');
  }
});

router.post('/tasks/delete/:id', requireAuth, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM tasks WHERE task_id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    res.redirect('/tasks');
  } catch (err) {
    console.error('Delete task error:', err.message);
    res.redirect('/tasks');
  }
});

router.get('/official-deadlines/new', requireAuth, (req, res) => {
  const role = req.session.user.role_type;
  if (role !== 'Teacher' && role !== 'Admin') return res.redirect('/tasks');

  res.render('tasks/official_deadline_form', {
    title: 'Post Official Deadline',
    VALID_MODULES,
    VALID_DEADLINE_TYPES,
    error: null,
  });
});

router.post('/official-deadlines/add', requireAuth, async (req, res) => {
  const role = req.session.user.role_type;
  if (role !== 'Teacher' && role !== 'Admin') return res.redirect('/tasks');

  const { title, description, module: mod, deadline_type, due_date } = req.body;
  const errors = [];

  if (!title || !title.trim()) errors.push('Title is required.');
  if (!mod || !isValidModule(mod)) errors.push('Please select a valid module.');
  if (!deadline_type || !VALID_DEADLINE_TYPES.includes(deadline_type)) errors.push('Please select a valid type.');
  if (!due_date) errors.push('Due date is required.');

  if (errors.length > 0) {
    return res.render('tasks/official_deadline_form', {
      title: 'Post Official Deadline',
      VALID_MODULES,
      VALID_DEADLINE_TYPES,
      error: errors.join(' '),
      form: req.body,
    });
  }

  try {
    await pool.execute(
      'INSERT INTO official_deadlines (title, description, module, deadline_type, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title.trim(), description || '', mod, deadline_type, due_date, req.session.userId]
    );
    res.redirect('/tasks');
  } catch (err) {
    console.error('Add official deadline error:', err.message);
    res.redirect('/tasks');
  }
});

router.post('/official-deadlines/delete/:id', requireAuth, async (req, res) => {
  const role = req.session.user.role_type;
  if (role !== 'Teacher' && role !== 'Admin') return res.redirect('/tasks');

  try {
    await pool.execute(
      'DELETE FROM official_deadlines WHERE deadline_id = ?',
      [req.params.id]
    );
    res.redirect('/tasks');
  } catch (err) {
    console.error('Delete official deadline error:', err.message);
    res.redirect('/tasks');
  }
});

module.exports = router;