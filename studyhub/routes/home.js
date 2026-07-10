const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

router.get('/home', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const today = new Date(); today.setHours(0,0,0,0);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

    const [allTasks] = await pool.execute(
      'SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC',
      [userId]
    );

    const overdue = allTasks.filter(t => new Date(t.due_date) < today && t.status !== 'Done').length;
    const dueSoon = allTasks.filter(t => {
      const d = new Date(t.due_date);
      return d >= today && d <= nextWeek && t.status !== 'Done';
    }).length;
    const done = allTasks.filter(t => t.status === 'Done').length;
    const total = allTasks.length;
    const upcomingTasks = allTasks.filter(t => t.status !== 'Done').slice(0, 5);

    res.render('home', {
      title: 'Home',
      user: req.session.user,
      overdue,
      dueSoon,
      done,
      total,
      upcomingTasks,
    });
  } catch (err) {
    console.error('Home error:', err.message);
    res.redirect('/profile');
  }
});

module.exports = router;