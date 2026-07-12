
CREATE DATABASE IF NOT EXISTS studyhub;
USE studyhub;

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
  class_section VARCHAR(20) DEFAULT 'All', -- e.g., 'C270-A', 'C270-B', or 'All'
  priority VARCHAR(20) DEFAULT 'Normal',  -- 'Low', 'Normal', 'High', 'Urgent'
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