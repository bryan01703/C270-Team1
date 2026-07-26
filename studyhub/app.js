require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');

const gradeRoutes = require('./routes/grades');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const taskRoutes = require('./routes/tasks');
const studyGroupRoutes = require('./routes/studygroups');
const homeRoutes = require('./routes/home');
const marketplaceRoutes = require('./routes/marketplace');
const announcementsRoutes = require('./routes/announcements');
const seedAdmin = require('./database/seed_admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'studyhub-dev-secret',
  resave: false,
  saveUninitialized: false,
}));

app.use((req, res, next) => {
  res.locals.userId = req.session.userId || null;
  res.locals.userRole = req.session.user ? req.session.user.role_type : null;
  next();
});

app.use('/', gradeRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', taskRoutes);
app.use('/', studyGroupRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/', homeRoutes);
app.use('/', announcementsRoutes);

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/home');
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/home');
  res.render('login', { title: 'Log In' });
});

app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/profile');
  res.render('register', { title: 'Sign Up' });
});

app.get('/unauthorized', (req, res) => {
  res.status(403).render('unauthorized', { title: 'Access Denied' });
});

app.listen(PORT, () => {
  console.log(`StudyHub running at http://localhost:${PORT}`);
  seedAdmin().catch(err => console.error('Admin seed failed:', err.message));
});