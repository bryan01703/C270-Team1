require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'studyhub',
  });

  const [existing] = await conn.query(
    'SELECT user_id FROM users WHERE username = ?',
    ['admin1']
  );

  if (existing.length === 0) {
    const hash = await bcrypt.hash('Pass123!', 12);
    await conn.query(
      'INSERT INTO users (username, password_hash, full_name, role_type, class_codes, bio) VALUES (?, ?, ?, ?, ?, ?)',
      ['admin1', hash, 'Admin One', 'Admin', '', 'System administrator']
    );
    console.log('Admin account seeded (admin1 / Pass123!)');
  } else {
    console.log('Admin account already exists');
  }

  await conn.end();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});