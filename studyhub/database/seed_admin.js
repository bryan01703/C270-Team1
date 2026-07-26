require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function seedAdmin(maxRetries = 10, retryDelay = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'studyhub',
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
      return;
    } catch (err) {
      console.log(`DB not ready (attempt ${attempt}/${maxRetries}): ${err.code}`);
      if (attempt < maxRetries) await sleep(retryDelay);
    }
  }
  console.error('Admin seed failed after max retries');
}

module.exports = seedAdmin;

if (require.main === module) {
  seedAdmin().catch(err => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
}
