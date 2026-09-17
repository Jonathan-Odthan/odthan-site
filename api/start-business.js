const db = require("./_lib/db");
const { checkRateLimit } = require("./_lib/rateLimit");
const { startBusinessSchema } = require("./_lib/validate");
const { getClientIp, readJsonBody } = require("./_lib/security");
const { sendJson, methodNotAllowed, handleError } = require("./_lib/respond");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const lang = (req.headers["x-lang"] === "fr") ? "fr" : "ht";

  try {
    const body = await readJsonBody(req);
    const parsed = startBusinessSchema.safeParse(body);
    if (!parsed.success) {
      return sendJson(res, 400, { error: "VALIDATION_ERROR", issues: parsed.error.issues });
    }
    if (parsed.data.company) return sendJson(res, 200, { ok: true }); // honeypot

    const ip = getClientIp(req);
    const rl = await checkRateLimit(`start:${ip}`, 5, 600);
    if (!rl.allowed) {
      return sendJson(res, 429, {
        error: "RATE_LIMITED",
        message: lang === "fr" ? "Trop de demandes envoyées. Réessayez dans quelques minutes." : "Twòp demann voye. Eseye ankò nan kèk minit.",
      });
    }

    const d = parsed.data;
    await db.query(
      `INSERT INTO business_starts
        (name, phone, whatsapp, email, city, department, business_name, industry,
         description, budget, needs, website_yn, shop_yn, facebook_yn, instagram_yn, seo_yn, extra, source_ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        d.name, d.phone, d.whatsapp || null, d.email, d.city || null, d.department || null,
        d.business_name || null, d.industry || null, d.description, d.budget || null, d.needs || null,
        Boolean(d.website_yn), Boolean(d.shop_yn), Boolean(d.facebook_yn), Boolean(d.instagram_yn), Boolean(d.seo_yn),
        d.extra || null, ip,
      ]
    );

    return sendJson(res, 200, { ok: true });
  } catch (err) {
    if (err.message === "INVALID_JSON") return sendJson(res, 400, { error: "INVALID_JSON" });
    return handleError(res, err, lang);
  }
};
