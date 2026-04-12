require('dotenv').config(); 
const mysql = require('mysql');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, 
    user: process.env.DB_USER,
    password: process.env.DB_PASS, 
    database: process.env.DB_NAME
    // Notice the SSL line that was here is now gone!
});

pool.getConnection((err, connection) => {
    if (err) {
        console.log("❌ MySQL Connection Failed:", err.message);
        return;
    }
    console.log(`✅ MySQL Pool Connected Successfully to ${process.env.DB_NAME}`);
    connection.release(); 
});

module.exports = pool;