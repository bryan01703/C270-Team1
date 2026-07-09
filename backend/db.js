// db.js
const mysql = require('mysql2');

// Create the connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',        // Your database username
  password: 'password',// Your database password
  database: 'my_website_db'
});

// Export the promise-based pool for cleaner async/await code
module.exports = pool.promise();