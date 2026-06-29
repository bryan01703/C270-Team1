const express = require('express');
const router = express.Router();

let tasks = [];

router.get('/', (req, res) => {
    res.render('tasks/index', { tasks });
});

router.post('/add', (req, res) => {
    const { title, module, due_date, status } = req.body;
    tasks.push({ id: Date.now(), title, module, due_date, status });
    res.redirect('/tasks');
});

router.post('/delete/:id', (req, res) => {
    tasks = tasks.filter(t => t.id != req.params.id);
    res.redirect('/tasks');
});

module.exports = router;