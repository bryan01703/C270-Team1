CREATE TABLE IF NOT EXISTS modules (
  module_code VARCHAR(20) PRIMARY KEY,
  module_name VARCHAR(150) NOT NULL,
  credits DECIMAL(5,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS module_assessments (
  module_code VARCHAR(20) NOT NULL,
  assessment_code VARCHAR(50) NOT NULL,
  assessment_name VARCHAR(150) NOT NULL,
  weight DECIMAL(5,2) NOT NULL,

  PRIMARY KEY (module_code, assessment_code),

  FOREIGN KEY (module_code)
    REFERENCES modules(module_code)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grade_scale (
  letter_grade VARCHAR(10) PRIMARY KEY,
  minimum_percentage DECIMAL(5,2) NOT NULL,
  grade_point DECIMAL(4,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS grades (
  grade_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  module_code VARCHAR(20) NOT NULL,
  assessment_code VARCHAR(50) NOT NULL,
  score DECIMAL(8,2) NOT NULL,
  maximum_score DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_student_assessment
    (user_id, module_code, assessment_code),

  FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  FOREIGN KEY (module_code, assessment_code)
    REFERENCES module_assessments(module_code, assessment_code)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_assessment_weights (
  user_id INT NOT NULL,
  module_code VARCHAR(20) NOT NULL,
  assessment_code VARCHAR(50) NOT NULL,
  weight DECIMAL(5,2) NOT NULL,

  PRIMARY KEY (
    user_id,
    module_code,
    assessment_code
  ),

  FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  FOREIGN KEY (module_code, assessment_code)
    REFERENCES module_assessments(
      module_code,
      assessment_code
    )
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_module_credits (
  user_id INT NOT NULL,
  module_code VARCHAR(20) NOT NULL,
  credits DECIMAL(5,2) NOT NULL,

  PRIMARY KEY (user_id, module_code),

  FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  FOREIGN KEY (module_code)
    REFERENCES modules(module_code)
    ON DELETE CASCADE
);