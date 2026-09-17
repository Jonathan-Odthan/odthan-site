const { clearSessionCookie } = require("../_lib/security");
const { sendJson, methodNotAllowed } = require("../_lib/respond");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  clearSessionCookie(res, req);
  return sendJson(res, 200, { ok: true });
};
