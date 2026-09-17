const db = require("./_lib/db");
const { checkRateLimit } = require("./_lib/rateLimit");
const { bookingSchema } = require("./_lib/validate");
const { getClientIp, readJsonBody } = require("./_lib/security");
const { sendJson, methodNotAllowed, handleError } = require("./_lib/respond");

// Créneaux ouverts, heure locale America/Port-au-Prince (UTC-5, pas de DST en Haïti).
const OPEN_HOURS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

module.exports = async function handler(req, res) {
  const lang = (req.headers["x-lang"] === "fr") ? "fr" : "ht";

  if (req.method === "GET") {
    // Disponibilité pour une date donnée: /api/reservation?date=YYYY-MM-DD
    try {
      const url = new URL(req.url, "http://internal");
      const date = url.searchParams.get("date");
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendJson(res, 400, { error: "VALIDATION_ERROR" });
      }
      const result = await db.query(
        `SELECT slot_time FROM bookings WHERE slot_date = $1 AND status = 'confirmed'`,
        [date]
      );
      const taken = result.rows.map((r) => r.slot_time.slice(0, 5));
      const available = OPEN_HOURS.filter((h) => !taken.includes(h));
      return sendJson(res, 200, { date, timezone: "America/Port-au-Prince", available, taken });
    } catch (err) {
      return handleError(res, err, lang);
    }
  }

  if (req.method !== "POST") return methodNotAllowed(res, ["GET", "POST"]);

  try {
    const body = await readJsonBody(req);
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return sendJson(res, 400, { error: "VALIDATION_ERROR", issues: parsed.error.issues });
    }
    if (parsed.data.company) return sendJson(res, 200, { ok: true }); // honeypot

    if (!OPEN_HOURS.includes(parsed.data.time)) {
      return sendJson(res, 400, {
        error: "SLOT_NOT_AVAILABLE",
        message: lang === "fr" ? "Ce créneau n'est pas ouvert à la réservation." : "Kreno sa a pa disponib pou rezèvasyon.",
      });
    }

    const ip = getClientIp(req);
    const rl = await checkRateLimit(`booking:${ip}`, 5, 600);
    if (!rl.allowed) {
      return sendJson(res, 429, {
        error: "RATE_LIMITED",
        message: lang === "fr" ? "Trop de réservations tentées. Réessayez dans quelques minutes." : "Twòp rezèvasyon eseye. Eseye ankò nan kèk minit.",
      });
    }

    const d = parsed.data;
    try {
      const result = await db.query(
        `INSERT INTO bookings
          (service, consult_type, slot_date, slot_time, name, phone, whatsapp, email, city, department, message, source_ip)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [d.service, d.consult_type, d.date, d.time, d.name, d.phone, d.whatsapp || null, d.email, d.city || null, d.department || null, d.message || null, ip]
      );
      return sendJson(res, 200, { ok: true, id: result.rows[0].id });
    } catch (dbErr) {
      // Violation de la contrainte unique (slot_date, slot_time) => créneau déjà pris
      if (dbErr.code === "23505") {
        return sendJson(res, 409, {
          error: "SLOT_ALREADY_BOOKED",
          message: lang === "fr" ? "Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez un autre horaire." : "Yon lòt moun sot rezève kreno sa a. Chwazi yon lòt lè.",
        });
      }
      throw dbErr;
    }
  } catch (err) {
    if (err.message === "INVALID_JSON") return sendJson(res, 400, { error: "INVALID_JSON" });
    return handleError(res, err, lang);
  }
};
