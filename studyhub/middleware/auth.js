function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(req.session.user.role_type)) {
      return res.status(403).render('unauthorized', {
        title: 'Access Denied',
      });
    }

    next();
  };
}

function blockNonAdmin(req, res, next) {
  if (!req.session.userId || req.session.user.role_type !== 'Admin') {
    return res.status(403).render('unauthorized', {
      title: 'Access Denied',
    });
  }
  next();
}

module.exports = { requireAuth, checkRole, blockNonAdmin };
