const { Pool } = require("pg");

let pool = null;

function isConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!isConfigured()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Hosted Postgres providers (Vercel Postgres, Neon, Supabase) require SSL.
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

async function query(text, params) {
  const p = getPool();
  if (!p) {
    const err = new Error("DATABASE_NOT_CONFIGURED");
    err.code = "DATABASE_NOT_CONFIGURED";
    throw err;
  }
  return p.query(text, params);
}

module.exports = { getPool, query, isConfigured };
