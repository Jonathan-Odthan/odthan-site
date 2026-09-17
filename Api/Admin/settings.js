const db = require("../_lib/db");
const { requireAdmin } = require("../_lib/adminGuard");
const { readJsonBody } = require("../_lib/security");
const { sendJson, methodNotAllowed, handleError } = require("../_lib/respond");

const ALLOWED_KEYS = ["whatsapp_number"];

module.exports = async function handler(req, res) {
  const session = await requireAdmin(req, res, ["admin"]); // seul le rôle admin peut changer les réglages
  if (!session) return;

  try {
    if (req.method === "GET") {
      const result = await db.query(`SELECT key, value FROM site_settings`);
      const settings = Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
      return sendJson(res, 200, { settings });
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const { key, value } = body;
      if (!ALLOWED_KEYS.includes(key) || typeof value !== "string" || value.length > 200) {
        return sendJson(res, 400, { error: "VALIDATION_ERROR" });
      }
      await db.query(
        `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
        [key, value]
      );
      await db.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ($1,$2,$3)`,
        [session.email, "settings_update", JSON.stringify({ key })]);
      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res, ["GET", "PUT"]);
  } catch (err) {
    return handleError(res, err);
  }
};
