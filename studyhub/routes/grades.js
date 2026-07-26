const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// Converts an assessment score into a percentage.
function calculatePercentage(score, maximumScore) {
  return (Number(score) / Number(maximumScore)) * 100;
}

// Finds the matching grade-scale record from MySQL.
function findGradeScale(gradeScale, percentage) {
  return gradeScale.find(
    grade => percentage >= Number(grade.minimum_percentage)
  );
}

// Calculates a module's current weighted percentage.
function calculateModulePercentage(assessments) {
  return assessments.reduce((total, assessment) => {
    if (
      assessment.score === null ||
      assessment.maximum_score === null
    ) {
      return total;
    }

    const percentage = calculatePercentage(
      assessment.score,
      assessment.maximum_score
    );

    return total + (
      percentage * Number(assessment.weight) / 100
    );
  }, 0);
}

// Calculates the weight that has not been completed yet.
function calculateRemainingWeight(assessments) {
  return assessments.reduce((total, assessment) => {
    if (
      assessment.score === null ||
      assessment.maximum_score === null
    ) {
      return total + Number(assessment.weight);
    }

    return total;
  }, 0);
}

// Calculates the average score needed in remaining assessments.
function calculateRequiredScore(
  currentPercentage,
  remainingWeight,
  targetPercentage
) {
  if (remainingWeight <= 0) {
    return null;
  }

  return (
    (Number(targetPercentage) - currentPercentage) /
    remainingWeight *
    100
  );
}

// Loads the grade tracker and calculates each module's GPA data.
router.get('/grades', requireAuth, async (req, res) => {
  try {
    const [modules] = await pool.execute(
      `SELECT
         module_code,
         module_name,
         credits
       FROM modules
       ORDER BY module_code`
    );

    const [assessments] = await pool.execute(
      `SELECT
         ma.module_code,
         ma.assessment_code,
         ma.assessment_name,
         ma.weight,
         g.score,
         g.maximum_score
       FROM module_assessments ma
       LEFT JOIN grades g
         ON g.module_code = ma.module_code
        AND g.assessment_code = ma.assessment_code
        AND g.user_id = ?
       ORDER BY ma.module_code, ma.assessment_code`,
      [req.session.userId]
    );

    const [gradeScale] = await pool.execute(
      `SELECT
         letter_grade,
         minimum_percentage,
         grade_point
       FROM grade_scale
       ORDER BY minimum_percentage DESC`
    );

    const targetGrade = gradeScale.find(
      grade => grade.letter_grade === 'A'
    );

    const moduleData = modules.map(module => {
      const moduleAssessments = assessments.filter(
        assessment =>
          assessment.module_code === module.module_code
      );

      const currentPercentage =
        calculateModulePercentage(moduleAssessments);

      const remainingWeight =
        calculateRemainingWeight(moduleAssessments);

      const requiredScore = targetGrade
        ? calculateRequiredScore(
            currentPercentage,
            remainingWeight,
            targetGrade.minimum_percentage
          )
        : null;

      const isComplete = remainingWeight <= 0;

      const finalGrade = isComplete
        ? findGradeScale(gradeScale, currentPercentage)
        : null;

      return {
        ...module,
        assessments: moduleAssessments,
        currentPercentage,
        remainingWeight,
        requiredScore,
        isComplete,
        finalGrade
      };
    });

    const completedModules = moduleData.filter(
      module => module.isComplete && module.finalGrade
    );

    const totalQualityPoints = completedModules.reduce(
      (total, module) => {
        return total +
          Number(module.finalGrade.grade_point) *
          Number(module.credits);
      },
      0
    );

    const totalCredits = completedModules.reduce(
      (total, module) => total + Number(module.credits),
      0
    );

    const gpa = totalCredits === 0
      ? 0
      : totalQualityPoints / totalCredits;

    res.render('grades/index', {
      title: 'Grade Tracker',
      modules: moduleData,
      gpa: gpa.toFixed(2)
    });
  } catch (err) {
    console.error('Load grade tracker error:', err);
    res.status(500).send('Unable to load grade tracker.');
  }
});

// Saves one assessment score into MySQL.
router.post('/grades/save', requireAuth, async (req, res) => {
  const {
    module_code,
    assessment_code,
    score,
    maximum_score
  } = req.body;

  const numericScore = Number(score);
  const numericMaximumScore = Number(maximum_score);

  if (
    !module_code ||
    !assessment_code ||
    !Number.isFinite(numericScore) ||
    !Number.isFinite(numericMaximumScore) ||
    numericMaximumScore <= 0 ||
    numericScore < 0 ||
    numericScore > numericMaximumScore
  ) {
    return res.redirect('/grades');
  }

  try {
    const [assessmentRows] = await pool.execute(
      `SELECT
         module_code,
         assessment_code
       FROM module_assessments
       WHERE module_code = ?
         AND assessment_code = ?`,
      [
        module_code,
        assessment_code
      ]
    );

    if (assessmentRows.length === 0) {
      return res.redirect('/grades');
    }

    await pool.execute(
      `INSERT INTO grades
       (
         user_id,
         module_code,
         assessment_code,
         score,
         maximum_score
       )
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         score = VALUES(score),
         maximum_score = VALUES(maximum_score)`,
      [
        req.session.userId,
        module_code,
        assessment_code,
        numericScore,
        numericMaximumScore
      ]
    );

    res.redirect('/grades');
  } catch (err) {
    console.error('Save grade error:', err);
    res.redirect('/grades');
  }
});

// Deletes one student's assessment score.
router.post('/grades/delete', requireAuth, async (req, res) => {
  const {
    module_code,
    assessment_code
  } = req.body;

  try {
    await pool.execute(
      `DELETE FROM grades
       WHERE user_id = ?
         AND module_code = ?
         AND assessment_code = ?`,
      [
        req.session.userId,
        module_code,
        assessment_code
      ]
    );

    res.redirect('/grades');
  } catch (err) {
    console.error('Delete grade error:', err);
    res.redirect('/grades');
  }
});

module.exports = router;