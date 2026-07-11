require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'studyhub',
  });

  try {
    await conn.query(`ALTER TABLE users ADD COLUMN class_codes VARCHAR(255) DEFAULT ''`);
    console.log('✓ Added class_codes column');
  } catch (e) {
    if (e.errno === 1060) console.log('~ class_codes already exists');
    else { console.error(e.message); process.exit(1); }
  }

  const [cols] = await conn.query('SHOW COLUMNS FROM users LIKE ?', ['class_section']);
  if (cols.length > 0) {
    await conn.query('ALTER TABLE users DROP COLUMN class_section');
    console.log('✓ Dropped old class_section column');
  }

  const [cols2] = await conn.query('SHOW COLUMNS FROM users LIKE ?', ['modules']);
  if (cols2.length > 0) {
    await conn.query('ALTER TABLE users DROP COLUMN modules');
    console.log('✓ Dropped old modules column');
  }

  console.log('Migration complete.');
  await conn.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
