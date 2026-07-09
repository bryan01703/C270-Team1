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