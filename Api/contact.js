const db = require("./_lib/db");
const { checkRateLimit } = require("./_lib/rateLimit");
const { contactSchema } = require("./_lib/validate");
const { getClientIp, readJsonBody } = require("./_lib/security");
const { sendJson, methodNotAllowed, handleError } = require("./_lib/respond");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const lang = (req.headers["x-lang"] === "fr") ? "fr" : "ht";

  try {
    const body = await readJsonBody(req);
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return sendJson(res, 400, { error: "VALIDATION_ERROR", issues: parsed.error.issues });
    }
    if (parsed.data.company) {
      // Honeypot rempli -> probablement un bot. On répond "succès" sans rien écrire,
      // pour ne pas indiquer au bot que le filtre a fonctionné.
      return sendJson(res, 200, { ok: true });
    }

    const ip = getClientIp(req);
    const rl = await checkRateLimit(`contact:${ip}`, 5, 600); // 5 messages / 10 min / IP
    if (!rl.allowed) {
      return sendJson(res, 429, {
        error: "RATE_LIMITED",
        message: lang === "fr" ? "Trop de messages envoyés. Réessayez dans quelques minutes." : "Twòp mesaj voye. Eseye ankò nan kèk minit.",
      });
    }

    const { name, phone, whatsapp, email, city, department, message } = parsed.data;
    await db.query(
      `INSERT INTO leads (name, phone, whatsapp, email, city, department, message, source_ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [name, phone, whatsapp || null, email, city || null, department || null, message, ip]
    );

    return sendJson(res, 200, { ok: true });
  } catch (err) {
    if (err.message === "INVALID_JSON") return sendJson(res, 400, { error: "INVALID_JSON" });
    return handleError(res, err, lang);
  }
};
