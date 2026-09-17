const db = require("./_lib/db");
const { sendJson, methodNotAllowed, handleError } = require("./_lib/respond");

// Endpoint public, lecture seule — expose uniquement les réglages non sensibles.
module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    const result = await db.query(`SELECT value FROM site_settings WHERE key = 'whatsapp_number'`);
    const whatsapp_number = result.rows[0] ? result.rows[0].value : null;
    res.setHeader("Cache-Control", "public, max-age=60");
    return sendJson(res, 200, { whatsapp_number });
  } catch (err) {
    // Si la base n'est pas encore configurée, on renvoie simplement "pas de valeur"
    // plutôt que de casser l'affichage du bouton WhatsApp par défaut du site.
    if (err && err.code === "DATABASE_NOT_CONFIGURED") {
      return sendJson(res, 200, { whatsapp_number: null });
    }
    return handleError(res, err);
  }
};
