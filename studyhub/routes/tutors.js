const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

function isAdmin(req) {
  return req.session.user && req.session.user.role_type === 'Admin';
}

function canBeTutor(req) {
  const role = req.session.user && req.session.user.role_type;
  return role === 'Student' || role === 'Teacher';
}

function cleanSubjects(value) {
  return String(value || '')
    .split(',')
    .map(subject => subject.trim().toUpperCase())
    .filter(Boolean)
    .join(',');
}

function cleanRate(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : null;
}

function messageText(code) {
  const messages = {
    saved: 'Tutor profile saved.',
    reviewed: 'Review saved.',
    reported: 'Report sent to an admin.',
    resolved: 'Report resolved.',
    invalid: 'Please check the form and try again.',
  };
  return messages[code] || '';
}

async function getOwnProfile(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM tutor_profiles WHERE user_id = ?',
    [userId]
  );
  return rows[0] || null;
}

router.get('/tutors', async (req, res) => {
  try {
    const [tutors] = await pool.execute(
      `SELECT tp.*, u.full_name, u.role_type,
              (SELECT ROUND(AVG(tr.rating), 1)
               FROM tutor_reviews tr WHERE tr.tutor_id = tp.tutor_id) AS average_rating,
              (SELECT COUNT(*)
               FROM tutor_reviews tr WHERE tr.tutor_id = tp.tutor_id) AS review_count
       FROM tutor_profiles tp
       JOIN users u ON u.user_id = tp.user_id
       WHERE tp.is_active = 1
       ORDER BY tp.created_at DESC`
    );

    const ownProfile = await getOwnProfile(req.session.userId);
    res.render('tutors', {
      title: 'Find a Tutor',
      page: 'directory',
      tutors,
      ownProfile,
      canBeTutor: canBeTutor(req),
      message: messageText(req.query.message),
    });
  } catch (err) {
    console.error('Tutor directory error:', err.message);
    res.status(500).send('Failed to load tutors. Run the tutor database migration first.');
  }
});

router.get('/tutors/admin/reports', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).render('unauthorized', { title: 'Access Denied' });
  }

  try {
    const [reports] = await pool.execute(
      `SELECT report.*, reporter.full_name AS reporter_name,
              tutor_user.full_name AS tutor_name,
              tp.headline AS tutor_headline,
              review.comment AS review_comment,
              review.rating AS review_rating,
              review_user.full_name AS review_author
       FROM tutor_reports report
       JOIN users reporter ON reporter.user_id = report.reporter_id
       LEFT JOIN tutor_profiles tp ON tp.tutor_id = report.tutor_id
       LEFT JOIN users tutor_user ON tutor_user.user_id = tp.user_id
       LEFT JOIN tutor_reviews review ON review.review_id = report.review_id
       LEFT JOIN users review_user ON review_user.user_id = review.reviewer_id
       WHERE report.status = 'Pending'
       ORDER BY report.created_at ASC`
    );

    res.render('tutors', {
      title: 'Tutor Reports',
      page: 'reports',
      reports,
      message: messageText(req.query.message),
    });
  } catch (err) {
    console.error('Tutor reports error:', err.message);
    res.status(500).send('Failed to load tutor reports.');
  }
});

router.get('/tutors/:id', async (req, res) => {
  const tutorId = Number(req.params.id);
  if (!Number.isInteger(tutorId)) return res.status(404).send('Tutor not found.');

  try {
    const [tutorRows] = await pool.execute(
      `SELECT tp.*, u.full_name, u.role_type
       FROM tutor_profiles tp
       JOIN users u ON u.user_id = tp.user_id
       WHERE tp.tutor_id = ?`,
      [tutorId]
    );

    if (tutorRows.length === 0) return res.status(404).send('Tutor not found.');

    const tutor = tutorRows[0];
    const isOwner = Number(tutor.user_id) === Number(req.session.userId);
    if (!tutor.is_active && !isOwner && !isAdmin(req)) {
      return res.status(404).send('Tutor not found.');
    }

    const [reviews] = await pool.execute(
      `SELECT tr.*, u.full_name AS reviewer_name
       FROM tutor_reviews tr
       JOIN users u ON u.user_id = tr.reviewer_id
       WHERE tr.tutor_id = ?
       ORDER BY tr.created_at DESC`,
      [tutorId]
    );

    const ownReview = reviews.find(
      review => Number(review.reviewer_id) === Number(req.session.userId)
    ) || null;
    const averageRating = reviews.length
      ? reviews.reduce((total, review) => total + Number(review.rating), 0) / reviews.length
      : null;

    res.render('tutors', {
      title: tutor.headline,
      page: 'profile',
      tutor,
      reviews,
      ownReview,
      averageRating,
      isOwner,
      message: messageText(req.query.message),
    });
  } catch (err) {
    console.error('Tutor profile error:', err.message);
    res.status(500).send('Failed to load tutor profile.');
  }
});

router.post('/tutors/profile', async (req, res) => {
  if (!canBeTutor(req)) {
    return res.status(403).render('unauthorized', { title: 'Access Denied' });
  }

  const headline = String(req.body.headline || '').trim();
  const subjects = cleanSubjects(req.body.subjects);
  const about = String(req.body.about || '').trim();
  const hourlyRate = cleanRate(req.body.hourly_rate);

  if (!headline || !subjects || hourlyRate === null) {
    return res.redirect('/tutors?message=invalid');
  }

  try {
    await pool.execute(
      `INSERT INTO tutor_profiles (user_id, headline, subjects, about, hourly_rate)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         headline = VALUES(headline), subjects = VALUES(subjects),
         about = VALUES(about), hourly_rate = VALUES(hourly_rate)`,
      [req.session.userId, headline, subjects, about, hourlyRate]
    );
    res.redirect('/tutors?message=saved');
  } catch (err) {
    console.error('Save tutor profile error:', err.message);
    res.status(500).send('Failed to save tutor profile.');
  }
});

router.post('/tutors/:id/reviews', async (req, res) => {
  const tutorId = Number(req.params.id);
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();

  if (!Number.isInteger(tutorId) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.redirect('/tutors/' + req.params.id + '?message=invalid');
  }

  try {
    const [tutors] = await pool.execute(
      'SELECT user_id FROM tutor_profiles WHERE tutor_id = ? AND is_active = 1',
      [tutorId]
    );
    if (tutors.length === 0) return res.status(404).send('Tutor not found.');
    if (Number(tutors[0].user_id) === Number(req.session.userId)) {
      return res.redirect('/tutors/' + tutorId + '?message=invalid');
    }

    await pool.execute(
      `INSERT INTO tutor_reviews (tutor_id, reviewer_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)`,
      [tutorId, req.session.userId, rating, comment]
    );
    res.redirect('/tutors/' + tutorId + '?message=reviewed');
  } catch (err) {
    console.error('Save tutor review error:', err.message);
    res.status(500).send('Failed to save review.');
  }
});

router.post('/tutors/:id/report', async (req, res) => {
  const tutorId = Number(req.params.id);
  const reason = String(req.body.reason || '').trim();
  if (!Number.isInteger(tutorId) || !reason) {
    return res.redirect('/tutors/' + req.params.id + '?message=invalid');
  }

  try {
    await pool.execute(
      `INSERT INTO tutor_reports (reporter_id, target_type, tutor_id, reason)
       VALUES (?, 'Tutor', ?, ?)`,
      [req.session.userId, tutorId, reason]
    );
    res.redirect('/tutors/' + tutorId + '?message=reported');
  } catch (err) {
    console.error('Report tutor error:', err.message);
    res.status(500).send('Failed to report tutor.');
  }
});

router.post('/tutors/:tutorId/reviews/:reviewId/report', async (req, res) => {
  const tutorId = Number(req.params.tutorId);
  const reviewId = Number(req.params.reviewId);
  const reason = String(req.body.reason || '').trim();
  if (!Number.isInteger(tutorId) || !Number.isInteger(reviewId) || !reason) {
    return res.redirect('/tutors/' + req.params.tutorId + '?message=invalid');
  }

  try {
    const [reviews] = await pool.execute(
      'SELECT review_id FROM tutor_reviews WHERE review_id = ? AND tutor_id = ?',
      [reviewId, tutorId]
    );
    if (reviews.length === 0) return res.status(404).send('Review not found.');

    await pool.execute(
      `INSERT INTO tutor_reports (reporter_id, target_type, tutor_id, review_id, reason)
       VALUES (?, 'Review', ?, ?, ?)`,
      [req.session.userId, tutorId, reviewId, reason]
    );
    res.redirect('/tutors/' + tutorId + '?message=reported');
  } catch (err) {
    console.error('Report review error:', err.message);
    res.status(500).send('Failed to report review.');
  }
});

router.post('/tutors/admin/reports/:id', async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).render('unauthorized', { title: 'Access Denied' });
  }

  const reportId = Number(req.params.id);
  const action = req.body.action;
  if (!Number.isInteger(reportId) || !['keep', 'remove'].includes(action)) {
    return res.redirect('/tutors/admin/reports?message=invalid');
  }

  try {
    const [rows] = await pool.execute(
      "SELECT * FROM tutor_reports WHERE report_id = ? AND status = 'Pending'",
      [reportId]
    );
    if (rows.length === 0) {
      return res.redirect('/tutors/admin/reports?message=invalid');
    }

    const report = rows[0];
    if (action === 'remove' && report.target_type === 'Tutor') {
      await pool.execute(
        'UPDATE tutor_profiles SET is_active = 0 WHERE tutor_id = ?',
        [report.tutor_id]
      );
    }
    if (action === 'remove' && report.target_type === 'Review') {
      await pool.execute(
        'DELETE FROM tutor_reviews WHERE review_id = ?',
        [report.review_id]
      );
    }

    await pool.execute(
      `UPDATE tutor_reports
       SET status = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
       WHERE report_id = ?`,
      [action === 'remove' ? 'Removed' : 'Kept', req.session.userId, reportId]
    );
    res.redirect('/tutors/admin/reports?message=resolved');
  } catch (err) {
    console.error('Resolve tutor report error:', err.message);
    res.status(500).send('Failed to resolve report.');
  }
});

module.exports = router;
