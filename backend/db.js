const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1q2w3e4r',
    database: 'dtube_db'
});

module.exports = pool;