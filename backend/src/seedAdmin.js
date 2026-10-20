require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD in .env');
  const hash = await bcrypt.hash(password, 12);
  await pool.execute(
    `INSERT INTO admins (username, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [username, hash]
  );
  console.log(`Admin account ready: ${username}`);
  await pool.end();
}
main().catch(async err => { console.error(err.message); await pool.end(); process.exit(1); });
