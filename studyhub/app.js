const express = require('express');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

const taskRoutes = require('./routes/tasks');
app.use('/tasks', taskRoutes);

app.get('/', (req, res) => {
    res.redirect('/tasks');
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});