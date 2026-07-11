require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'studyhub',
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS study_groups (
        group_id INT AUTO_INCREMENT PRIMARY KEY,
        group_name VARCHAR(100) NOT NULL,
        module_code VARCHAR(20) NOT NULL,
        session_date DATE NOT NULL,
        session_time VARCHAR(20) NOT NULL,
        location VARCHAR(150) NOT NULL,
        session_link VARCHAR(255) DEFAULT '',
        description VARCHAR(500) DEFAULT '',
        max_slots INT NOT NULL DEFAULT 4,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
    console.log('✓ study_groups table ready');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS study_group_members (
        group_id INT NOT NULL,
        user_id INT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES study_groups(group_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
    console.log('✓ study_group_members table ready');

    console.log('Study group migration complete.');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
