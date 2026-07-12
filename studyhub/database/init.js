require('dotenv').config();
const mysql = require('mysql2/promise');

async function init() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  await conn.query('CREATE DATABASE IF NOT EXISTS studyhub');
  await conn.query('USE studyhub');
  await conn.query(`CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    class_codes VARCHAR(255) DEFAULT '',
    bio VARCHAR(500) DEFAULT '',
    role_type VARCHAR(20) DEFAULT 'Student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log('Database initialized successfully.');
    //creating announcement table
  await conn.query(`CREATE TABLE IF NOT EXISTS announcements (
    announcement_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    module_code VARCHAR(10) NOT NULL,
    class_section VARCHAR(50) DEFAULT 'All',
    priority VARCHAR(20) DEFAULT 'Normal',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
  )`);

  await conn.end();
}

init().catch(err => {
  console.error('Database init failed:', err.message);
  process.exit(1);
});
