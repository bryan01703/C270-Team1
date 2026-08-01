require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false },
  });

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tutor_profiles (
      tutor_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      headline VARCHAR(150) NOT NULL,
      subjects VARCHAR(255) NOT NULL,
      about TEXT,
      hourly_rate DECIMAL(8,2) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tutor_reviews (
      review_id INT AUTO_INCREMENT PRIMARY KEY,
      tutor_id INT NOT NULL,
      reviewer_id INT NOT NULL,
      rating TINYINT NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_tutor_review (tutor_id, reviewer_id),
      FOREIGN KEY (tutor_id) REFERENCES tutor_profiles(tutor_id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS tutor_reports (
      report_id INT AUTO_INCREMENT PRIMARY KEY,
      reporter_id INT NOT NULL,
      target_type ENUM('Tutor', 'Review') NOT NULL,
      tutor_id INT,
      review_id INT,
      reason VARCHAR(500) NOT NULL,
      status ENUM('Pending', 'Kept', 'Removed') NOT NULL DEFAULT 'Pending',
      resolved_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL,
      FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (tutor_id) REFERENCES tutor_profiles(tutor_id) ON DELETE SET NULL,
      FOREIGN KEY (review_id) REFERENCES tutor_reviews(review_id) ON DELETE SET NULL,
      FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL
    )
  `);

  console.log('Tutor tables are ready.');
  await connection.end();
}

migrate().catch(err => {
  console.error('Tutor migration failed:', err.message);
  process.exit(1);
});
