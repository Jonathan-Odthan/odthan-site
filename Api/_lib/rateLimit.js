const db = require("./db");

/**
 * Fenêtre fixe simple, stockée en base (les fonctions serverless n'ont pas
 * de mémoire partagée entre invocations, donc un limiteur en mémoire ne
 * protège rien sur Vercel — on utilise Postgres comme source de vérité).
 *
 * @param {string} key   identifiant unique (ex: "contact:203.0.113.4")
 * @param {number} limit nombre de requêtes autorisées par fenêtre
 * @param {number} windowSeconds taille de la fenêtre en secondes
 */
async function checkRateLimit(key, limit, windowSeconds) {
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const result = await db.query(
    `INSERT INTO rate_limits (bucket_key, window_start, count)
     VALUES ($1, $2, 1)
     ON CONFLICT (bucket_key, window_start)
     DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [key, windowStart.toISOString()]
  );
  const count = result.rows[0].count;
  return { allowed: count <= limit, count, limit };
}

module.exports = { checkRateLimit };
