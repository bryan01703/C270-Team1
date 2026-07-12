-- Marketplace notes feature for StudyHub.
-- Run this once after database/init.sql, or use: npm run migrate:marketplace

USE studyhub;

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
