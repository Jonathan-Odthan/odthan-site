/**
 * Kreye premye kont admin la.
 * Utilisation :
 *   DATABASE_URL=postgres://... node scripts/seed-admin.js admin@odthan.com "UnMotDePasseFort123!"
 */
require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const [, , email, password, role = "admin"] = process.argv;
  if (!email || !password) {
    console.error("Usage: node scripts/seed-admin.js <email> <password> [admin|editor]");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL n'est pas défini.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO admin_users (email, password_hash, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = $3, is_active = true, failed_attempts = 0, locked_until = NULL`,
    [email.toLowerCase(), hash, role]
  );

  console.log(`Compte admin prêt : ${email} (rôle: ${role})`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
