function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
}

// Traduit les erreurs internes en réponses honnêtes plutôt que de simuler
// un succès quand un service (base de données, secret JWT) n'est pas
// configuré — principe déjà appliqué ailleurs dans l'écosystème ODTHAN.
function handleError(res, err, lang) {
  const isFr = lang === "fr";
  if (err && err.code === "DATABASE_NOT_CONFIGURED") {
    return sendJson(res, 503, {
      error: "SERVICE_NOT_CONFIGURED",
      message: isFr
        ? "La base de données n'est pas encore configurée sur ce déploiement (variable DATABASE_URL manquante)."
        : "Baz done a poko konfigire sou deplwaman sa a (varyab DATABASE_URL manke).",
    });
  }
  if (err && err.code === "JWT_SECRET_NOT_CONFIGURED") {
    return sendJson(res, 503, {
      error: "SERVICE_NOT_CONFIGURED",
      message: isFr
        ? "L'authentification n'est pas encore configurée sur ce déploiement (variable JWT_SECRET manquante)."
        : "Otantifikasyon an poko konfigire sou deplwaman sa a (varyab JWT_SECRET manke).",
    });
  }
  console.error(err);
  return sendJson(res, 500, {
    error: "INTERNAL_ERROR",
    message: isFr ? "Yon erè entèn rive. Eseye ankò pita." : "Yon erè entèn rive. Eseye ankò pita.",
  });
}

module.exports = { sendJson, methodNotAllowed, handleError };
