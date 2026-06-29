const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'studyhub-dev-secret',
  resave: false,
  saveUninitialized: false,
}));

app.use((req, res, next) => {
  res.locals.userId = req.session.userId;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

const DEMO_USER = {
  id: 1,
  username: 'demo',
  password: 'password',
  name: 'Alex Tan',
  class: 'DIT/FT/2A/01',
  modules: 'C270, C271, C272',
  created_at: '2026-06-29',
};

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/profile');
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/profile');
  res.render('login', { title: 'Log In' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { title: 'Log In', error: 'All fields are required.' });
  }
  if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
    return res.render('login', { title: 'Log In', error: 'Invalid username or password. (hint: username = demo, password = password)' });
  }
  req.session.userId = DEMO_USER.id;
  req.session.user = { ...DEMO_USER };
  res.redirect('/profile');
});

app.get('/signup', (req, res) => {
  if (req.session.userId) return res.redirect('/profile');
  res.render('signup', { title: 'Sign Up' });
});

app.post('/signup', (req, res) => {
  const { username, password, name, class: userClass } = req.body;
  if (!username || !password || !name || !userClass) {
    return res.render('signup', { title: 'Sign Up', error: 'All fields are required.' });
  }
  req.session.userId = 1;
  req.session.user = {
    id: 1,
    username,
    name,
    class: userClass,
    modules: '',
    created_at: new Date().toISOString().slice(0, 10),
  };
  res.redirect('/profile');
});

app.get('/profile', requireAuth, (req, res) => {
  res.render('profile', { title: 'My Profile', user: req.session.user });
});

app.post('/profile', requireAuth, (req, res) => {
  const { name, class: userClass, modules } = req.body;
  req.session.user.name = name;
  req.session.user.class = userClass;
  req.session.user.modules = modules;
  res.render('profile', { title: 'My Profile', user: req.session.user, success: 'Profile updated!' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.listen(PORT, () => {
  console.log(`StudyHub running at http://localhost:${PORT}`);
});
