CREATE DATABASE IF NOT EXISTS studyhub;
USE studyhub;

-- ============================================================
-- Core tables (no FK dependencies)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  class_codes VARCHAR(255) DEFAULT '',
  bio VARCHAR(500) DEFAULT '',
  role_type VARCHAR(20) DEFAULT 'Student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modules (
  module_code VARCHAR(20) PRIMARY KEY,
  module_name VARCHAR(150) NOT NULL,
  credits DECIMAL(5,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS grade_scale (
  letter_grade VARCHAR(10) PRIMARY KEY,
  minimum_percentage DECIMAL(5,2) NOT NULL,
  grade_point DECIMAL(4,2) NOT NULL
);

-- ============================================================
-- Tables with single-level FK dependencies
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  task_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  task_type ENUM('Assignment', 'Certification', 'To-Do', 'Quiz', 'Project') NOT NULL,
  module VARCHAR(10) NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('Not Started', 'In Progress', 'Done') NOT NULL DEFAULT 'Not Started',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS official_deadlines (
  deadline_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description VARCHAR(500) DEFAULT '',
  module VARCHAR(10) NOT NULL,
  deadline_type ENUM('Exam', 'Project', 'Assignment', 'Quiz', 'Other') NOT NULL,
  due_date DATE NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcements (
  announcement_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  module_code VARCHAR(10) NOT NULL,
  class_section VARCHAR(20) DEFAULT 'All',
  priority VARCHAR(20) DEFAULT 'Normal',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcement_audit (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT NOT NULL,
  action VARCHAR(20) NOT NULL,
  performed_by INT NOT NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  title_snapshot VARCHAR(255),
  FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_groups (
  group_id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  module_code VARCHAR(20) NOT NULL,
  session_date DATE NOT NULL,
  session_time VARCHAR(20) NOT NULL,
  location VARCHAR(150) NOT NULL,
  session_link VARCHAR(255) DEFAULT '',
  description TEXT,
  max_slots INT NOT NULL DEFAULT 5,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS certifications (
  cert_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  status ENUM('In Progress', 'Completed') NOT NULL DEFAULT 'In Progress',
  target_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS module_assessments (
  module_code VARCHAR(20) NOT NULL,
  assessment_code VARCHAR(50) NOT NULL,
  assessment_name VARCHAR(150) NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (module_code, assessment_code),
  FOREIGN KEY (module_code) REFERENCES modules(module_code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marketplace_notes (
  note_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  module VARCHAR(50) NOT NULL,
  price VARCHAR(50) NOT NULL DEFAULT 'Free',
  file_name VARCHAR(255),
  file_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- Tables with multi-level FK dependencies
-- ============================================================

CREATE TABLE IF NOT EXISTS study_group_members (
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES study_groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grades (
  grade_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  module_code VARCHAR(20) NOT NULL,
  assessment_code VARCHAR(50) NOT NULL,
  score DECIMAL(8,2) NOT NULL,
  maximum_score DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_assessment (user_id, module_code, assessment_code),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (module_code, assessment_code) REFERENCES module_assessments(module_code, assessment_code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (announcement_id, user_id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(announcement_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_assessment_weights (
  user_id INT NOT NULL,
  module_code VARCHAR(20) NOT NULL,
  assessment_code VARCHAR(50) NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (user_id, module_code, assessment_code),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (module_code, assessment_code) REFERENCES module_assessments(module_code, assessment_code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_module_credits (
  user_id INT NOT NULL,
  module_code VARCHAR(20) NOT NULL,
  credits DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (user_id, module_code),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (module_code) REFERENCES modules(module_code) ON DELETE CASCADE
);
