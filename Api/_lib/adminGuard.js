const { getSession, verifyCsrf, requireRole } = require("./security");
const { sendJson } = require("./respond");

/**
 * Vérifie la session admin (cookie JWT httpOnly) et, pour toute requête qui
 * modifie des données (tout sauf GET), vérifie aussi le jeton CSRF envoyé
 * dans l'en-tête X-CSRF-Token contre le cookie non-HttpOnly correspondant
 * (pattern "double-submit cookie").
 *
 * Retourne la session si tout est en ordre, sinon envoie la réponse
 * d'erreur appropriée et retourne null — l'appelant doit alors `return`.
 */
async function requireAdmin(req, res, roles = ["admin", "editor"]) {
  const session = await getSession(req);
  if (!session) {
    sendJson(res, 401, { error: "NOT_AUTHENTICATED" });
    return null;
  }
  if (!requireRole(session, roles)) {
    sendJson(res, 403, { error: "FORBIDDEN" });
    return null;
  }
  if (req.method !== "GET" && !verifyCsrf(req)) {
    sendJson(res, 403, { error: "CSRF_INVALID" });
    return null;
  }
  return session;
}

module.exports = { requireAdmin };
