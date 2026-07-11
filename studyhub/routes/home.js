const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

router.get('/home', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const today = new Date(); today.setHours(0,0,0,0);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];

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

    let officialDeadlines = [];
    try {
      const [rows] = await pool.execute(
        `SELECT od.*, u.full_name AS created_by_name
         FROM official_deadlines od
         JOIN users u ON od.created_by = u.user_id
         WHERE od.due_date >= ?
         ORDER BY od.due_date ASC LIMIT 3`,
        [todayStr]
      );
      officialDeadlines = rows;
    } catch (e) {}

    let announcements = [];
    try {
      const [rows] = await pool.execute(
        `SELECT a.*, u.full_name AS poster_name 
         FROM announcements a 
         JOIN users u ON a.created_by = u.user_id 
         ORDER BY a.created_at DESC LIMIT 3`
      );
      announcements = rows;
    } catch (e) {}

    res.render('home', {
      title: 'Home',
      user: req.session.user,
      overdue,
      dueSoon,
      done,
      total,
      upcomingTasks,
      officialDeadlines,
      announcements,
    });
  } catch (err) {
    console.error('Home error:', err.message);
    res.redirect('/profile');
  }
});

module.exports = router;