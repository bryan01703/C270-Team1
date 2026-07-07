const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const VALID_MODULES = [
  // General
  'G121', 'G123', 'G124', 'G125', 'G131', 'G132', 'G133', 'G134', 'G135',
  // Discipline
  'C110', 'C112', 'C206', 'C207', 'C210', 'C227', 'C235', 'C237', 'C240', 'E123',
  // Major (Full Stack)
  'C218', 'C245', 'C257', 'C270', 'C304', 'C339', 'C346', 'C390',
];

const VALID_STATUSES = ['Not Started', 'In Progress', 'Done'];

const VALID_TASK_TYPES = ['Assignment', 'Certification', 'To-Do', 'Quiz', 'Project'];

// View all tasks
router.get('/tasks', requireAuth, async (req, res) => {
  try {
    const { status, module: modFilter } = req.query;

    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [req.session.userId];

    if (status && VALID_STATUSES.includes(status)) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (modFilter && VALID_MODULES.includes(modFilter)) {
      query += ' AND module = ?';
      params.push(modFilter);
    }

    query += ' ORDER BY due_date ASC';

    const [tasks] = await pool.execute(query, params);

    res.render('tasks/index', {
      title: 'My Tasks',
      tasks,
      VALID_MODULES,
      VALID_STATUSES,
      VALID_TASK_TYPES,
      selectedStatus: status || '',
      selectedModule: modFilter || '',
    });
  } catch (err) {
    console.error('Tasks fetch error:', err.message);
    res.render('tasks/index', {
      title: 'My Tasks',
      tasks: [],
      VALID_MODULES,
      VALID_STATUSES,
      VALID_TASK_TYPES,
      selectedStatus: '',
      selectedModule: '',
      error: 'Failed to load tasks.',
    });
  }
});

// Add task
router.post('/tasks/add', requireAuth, async (req, res) => {
  const { title, module: mod, due_date, status, task_type } = req.body;
  const errors = [];

  if (!title || !title.trim()) errors.push('Task title is required.');
  if (title && title.trim().length > 100) errors.push('Title must be under 100 characters.');
  if (!mod || !VALID_MODULES.includes(mod)) errors.push('Please select a valid module.');
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
    return res.render('tasks/index', {
      title: 'My Tasks',
      tasks,
      VALID_MODULES,
      VALID_STATUSES,
      VALID_TASK_TYPES,
      selectedStatus: '',
      selectedModule: '',
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

// Edit task - show form
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

// Edit task - submit
router.post('/tasks/edit/:id', requireAuth, async (req, res) => {
  const { title, module: mod, due_date, status, task_type } = req.body;
  const errors = [];

  if (!title || !title.trim()) errors.push('Task title is required.');
  if (title && title.trim().length > 100) errors.push('Title must be under 100 characters.');
  if (!mod || !VALID_MODULES.includes(mod)) errors.push('Please select a valid module.');
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

// Delete task
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

module.exports = router;