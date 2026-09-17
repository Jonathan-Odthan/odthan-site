const db = require("../_lib/db");
const { checkRateLimit } = require("../_lib/rateLimit");
const { loginSchema } = require("../_lib/validate");
const { verifyPassword, setSessionCookie, getClientIp, readJsonBody } = require("../_lib/security");
const { sendJson, methodNotAllowed, handleError } = require("../_lib/respond");

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const lang = (req.headers["x-lang"] === "fr") ? "fr" : "ht";
  const ip = getClientIp(req);

  try {
    const body = await readJsonBody(req);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return sendJson(res, 400, { error: "VALIDATION_ERROR" });

    const rl = await checkRateLimit(`login:${ip}`, 10, 600); // 10 tentatives / 10 min / IP, toutes adresses confondues
    if (!rl.allowed) {
      return sendJson(res, 429, { error: "RATE_LIMITED", message: lang === "fr" ? "Trop de tentatives. Réessayez plus tard." : "Twòp tantativ. Eseye pita." });
    }

    const { email, password } = parsed.data;
    const result = await db.query(
      `SELECT id, email, password_hash, role, is_active, failed_attempts, locked_until FROM admin_users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    const genericFail = () => sendJson(res, 401, {
      error: "INVALID_CREDENTIALS",
      message: lang === "fr" ? "E-mail ou mot de passe incorrect." : "Imèl oswa modpas pa kòrèk.",
    });

    if (!user || !user.is_active) {
      await db.query(`INSERT INTO audit_logs (actor, action, detail, ip) VALUES ($1,$2,$3,$4)`,
        [email, "login_failed", JSON.stringify({ reason: "no_such_user" }), ip]);
      return genericFail();
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return sendJson(res, 423, {
        error: "ACCOUNT_LOCKED",
        message: lang === "fr" ? "Compte temporairement verrouillé après plusieurs échecs. Réessayez plus tard." : "Kont lan bloke pou kèk tan apre plizyè echèk. Eseye pita.",
      });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      const attempts = user.failed_attempts + 1;
      const lock = attempts >= MAX_ATTEMPTS;
      await db.query(
        `UPDATE admin_users SET failed_attempts = $1, locked_until = $2 WHERE id = $3`,
        [lock ? 0 : attempts, lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null, user.id]
      );
      await db.query(`INSERT INTO audit_logs (actor, action, detail, ip) VALUES ($1,$2,$3,$4)`,
        [email, "login_failed", JSON.stringify({ attempts }), ip]);
      return genericFail();
    }

    await db.query(`UPDATE admin_users SET failed_attempts = 0, locked_until = NULL WHERE id = $1`, [user.id]);
    await db.query(`INSERT INTO audit_logs (actor, action, ip) VALUES ($1,$2,$3)`, [email, "login_success", ip]);

    await setSessionCookie(res, req, { sub: user.id, email: user.email, role: user.role });
    return sendJson(res, 200, { ok: true, email: user.email, role: user.role });
  } catch (err) {
    return handleError(res, err, lang);
  }
};
