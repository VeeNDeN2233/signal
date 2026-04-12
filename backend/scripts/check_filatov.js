const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: process.env.DB_NAME || 'signal_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '8843',
});
(async () => {
  const r = await pool.query(`
    SELECT u.id, u.login, e.id AS emp_id, e.position_id, p.name AS pos_name, e.last_name
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id
    LEFT JOIN positions p ON p.id = e.position_id
    WHERE u.login ILIKE '%filat%' OR e.last_name ILIKE '%Филат%'
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
})();
