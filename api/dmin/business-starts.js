const db = require("../_lib/db");
const { requireAdmin } = require("../_lib/adminGuard");
const { readJsonBody } = require("../_lib/security");
const { sendJson, methodNotAllowed, handleError } = require("../_lib/respond");

module.exports = async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === "GET") {
      const result = await db.query(
        `SELECT id, name, phone, whatsapp, email, city, department, business_name, industry,
                description, budget, needs, website_yn, shop_yn, facebook_yn, instagram_yn, seo_yn,
                extra, status, created_at
         FROM business_starts ORDER BY created_at DESC LIMIT 200`
      );
      return sendJson(res, 200, { items: result.rows });
    }

    if (req.method === "PATCH") {
      const body = await readJsonBody(req);
      const { id, status } = body;
      if (!id || !["new", "contacted", "closed"].includes(status)) {
        return sendJson(res, 400, { error: "VALIDATION_ERROR" });
      }
      await db.query(`UPDATE business_starts SET status = $1 WHERE id = $2`, [status, id]);
      await db.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ($1,$2,$3)`,
        [session.email, "business_start_status_update", JSON.stringify({ id, status })]);
      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res, ["GET", "PATCH"]);
  } catch (err) {
    return handleError(res, err);
  }
};
