require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'studyhub',
  });

  await conn.query(`
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
    )
  `);

  console.log('✓ marketplace_notes table ready');
  await conn.end();
}

migrate().catch(err => {
  console.error('Marketplace migration failed:', err.message);
  process.exit(1);
});
