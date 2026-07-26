const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// Converts a score into a percentage.
function calculatePercentage(score, maximumScore) {
  return Number(score) / Number(maximumScore) * 100;
}

// Finds the matching grade from the database grading scale.
function findGradeScale(gradeScale, percentage) {
  return gradeScale.find(
    grade => percentage >= Number(grade.minimum_percentage)
  );
}

// Calculates the completed weighted score.
function calculateModulePercentage(assessments) {
  return assessments.reduce((total, assessment) => {
    const hasScore =
      assessment.score !== null &&
      assessment.maximum_score !== null;

    if (!hasScore) {
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

// Calculates the remaining assessment weight.
function calculateRemainingWeight(assessments) {
  return assessments.reduce((total, assessment) => {
    const hasScore =
      assessment.score !== null &&
      assessment.maximum_score !== null;

    if (hasScore) {
      return total;
    }

    return total + Number(assessment.weight);
  }, 0);
}

// Calculates the score needed in remaining assessments for an A.
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

// Loads modules linked to the user and calculates GPA.
router.get('/grades', requireAuth, async (req, res) => {
  try {
    // Gets the logged-in user's class codes from MySQL.
    const [userRows] = await pool.execute(
      `SELECT class_codes
       FROM users
       WHERE user_id = ?`,
      [req.session.userId]
    );

    // Converts class codes such as C270-020 into module codes such as C270.
    const savedClassCodes =
      userRows[0]?.class_codes || '';

    const userModuleCodes = savedClassCodes
      .split(',')
      .map(classCode => classCode.trim())
      .filter(classCode => classCode.length > 0)
      .map(classCode => {
        return classCode
          .split('-')[0]
          .trim()
          .toUpperCase();
      });

    // Loads all available modules from MySQL.
    const [allModules] = await pool.execute(
    `SELECT
        m.module_code,
        m.module_name,
        COALESCE(
        umc.credits,
        m.credits
        ) AS credits
    FROM modules m
    LEFT JOIN user_module_credits umc
        ON umc.module_code = m.module_code
        AND umc.user_id = ?
    ORDER BY m.module_code`,
    [req.session.userId]
    );

    // Keeps only modules associated with the logged-in user.
    const modules = allModules.filter(module => {
      return userModuleCodes.includes(
        String(module.module_code)
          .trim()
          .toUpperCase()
      );
    });

    // Loads official weights or saved personal weights.
    const [assessments] = await pool.execute(
      `SELECT
         ma.module_code,
         ma.assessment_code,
         ma.assessment_name,
         COALESCE(
           uaw.weight,
           ma.weight
         ) AS weight,
         g.score,
         g.maximum_score
       FROM module_assessments ma
       LEFT JOIN user_assessment_weights uaw
         ON uaw.module_code = ma.module_code
        AND uaw.assessment_code = ma.assessment_code
        AND uaw.user_id = ?
       LEFT JOIN grades g
         ON g.module_code = ma.module_code
        AND g.assessment_code = ma.assessment_code
        AND g.user_id = ?
       ORDER BY
         ma.module_code,
         ma.assessment_code`,
      [
        req.session.userId,
        req.session.userId
      ]
    );

    // Loads the grading scale from MySQL.
    const [gradeScale] = await pool.execute(
      `SELECT
         letter_grade,
         minimum_percentage,
         grade_point
       FROM grade_scale
       ORDER BY minimum_percentage DESC`
    );

    // Gets the A-grade requirement from MySQL.
    const targetGrade = gradeScale.find(
      grade => grade.letter_grade === 'A'
    );

    // Calculates each module.
    const moduleData = modules.map(module => {
      const moduleAssessments = assessments.filter(
        assessment =>
          assessment.module_code === module.module_code
      );

      const currentPercentage =
        calculateModulePercentage(moduleAssessments);

      const remainingWeight =
        calculateRemainingWeight(moduleAssessments);

      const totalWeight = moduleAssessments.reduce(
        (total, assessment) => {
          return total + Number(assessment.weight);
        },
        0
      );

      const requiredScore = targetGrade
        ? calculateRequiredScore(
            currentPercentage,
            remainingWeight,
            targetGrade.minimum_percentage
          )
        : null;

      const isComplete =
        moduleAssessments.length > 0 &&
        remainingWeight <= 0;

      const finalGrade = isComplete
        ? findGradeScale(
            gradeScale,
            currentPercentage
          )
        : null;

      return {
        ...module,
        assessments: moduleAssessments,
        currentPercentage,
        remainingWeight,
        totalWeight,
        requiredScore,
        isComplete,
        finalGrade
      };
    });

    // Only completed modules are included in GPA.
    const completedModules = moduleData.filter(
      module =>
        module.isComplete &&
        module.finalGrade
    );

    // Calculates total quality points.
    const totalQualityPoints = completedModules.reduce(
      (total, module) => {
        return total +
          Number(module.finalGrade.grade_point) *
          Number(module.credits);
      },
      0
    );

    // Calculates total credits.
    const totalCredits = completedModules.reduce(
      (total, module) => {
        return total + Number(module.credits);
      },
      0
    );

    // Calculates GPA.
    const gpa = totalCredits === 0
      ? 0
      : totalQualityPoints / totalCredits;

    res.render('grades/index', {
      title: 'Grade Tracker',
      modules: moduleData,
      gpa: gpa.toFixed(2)
    });
  } catch (err) {
    console.error('Grade page error:', err);
    res.status(500).send('Unable to load grade tracker.');
  }
});

// Saves one assessment score.
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
      `SELECT assessment_code
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

// Saves custom assessment weights for one module.
router.post(
  '/grades/save-weights',
  requireAuth,
  async (req, res) => {
    const { module_code } = req.body;

    if (!module_code) {
      return res.redirect('/grades');
    }

    const connection = await pool.getConnection();

    try {
      const [assessments] = await connection.execute(
        `SELECT assessment_code
         FROM module_assessments
         WHERE module_code = ?`,
        [module_code]
      );

      if (assessments.length === 0) {
        connection.release();
        return res.redirect('/grades');
      }

      const weights = assessments.map(assessment => {
        return {
          assessmentCode: assessment.assessment_code,
          weight: Number(
            req.body[
              `weight_${assessment.assessment_code}`
            ]
          )
        };
      });

      const invalidWeight = weights.some(
        assessment =>
          !Number.isFinite(assessment.weight) ||
          assessment.weight < 0 ||
          assessment.weight > 100
      );

      if (invalidWeight) {
        connection.release();
        return res.redirect('/grades');
      }

      const totalWeight = weights.reduce(
        (total, assessment) => {
          return total + assessment.weight;
        },
        0
      );

      if (Math.abs(totalWeight - 100) > 0.01) {
        connection.release();
        return res.redirect('/grades');
      }

      await connection.beginTransaction();

      for (const assessment of weights) {
        await connection.execute(
          `INSERT INTO user_assessment_weights
           (
             user_id,
             module_code,
             assessment_code,
             weight
           )
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             weight = VALUES(weight)`,
          [
            req.session.userId,
            module_code,
            assessment.assessmentCode,
            assessment.weight
          ]
        );
      }

      await connection.commit();
      connection.release();

      res.redirect('/grades');
    } catch (err) {
      await connection.rollback();
      connection.release();

      console.error('Save weight error:', err);
      res.redirect('/grades');
    }
  }
);

// Deletes one assessment score.
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

// Saves a user's custom credit value for a module.
router.post(
  '/grades/save-credits',
  requireAuth,
  async (req, res) => {
    const {
      module_code,
      credits
    } = req.body;

    const numericCredits = Number(credits);

    if (
      !module_code ||
      !Number.isFinite(numericCredits) ||
      numericCredits <= 0
    ) {
      return res.redirect('/grades');
    }

    try {
      await pool.execute(
        `INSERT INTO user_module_credits
         (user_id, module_code, credits)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           credits = VALUES(credits)`,
        [
          req.session.userId,
          module_code,
          numericCredits
        ]
      );

      res.redirect('/grades');
    } catch (err) {
      console.error('Save credits error:', err);
      res.redirect('/grades');
    }
  }
);

module.exports = router;