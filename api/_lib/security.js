const bcrypt = require("bcryptjs");
const { SignJWT, jwtVerify } = require("jose");
const crypto = require("crypto");

const SESSION_COOKIE = "odthan_session";
const CSRF_COOKIE = "odthan_csrf";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw Object.assign(new Error("JWT_SECRET_NOT_CONFIGURED"), { code: "JWT_SECRET_NOT_CONFIGURED" });
  }
  return new TextEncoder().encode(secret);
}

// ---------- Passwords ----------
async function hashPassword(plain) {
  return bcrypt.hash(plain, 12); // 12 rounds, cf. principes de sécurité ODTHAN
}
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ---------- Sessions (JWT httpOnly) ----------
async function signSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}
async function verifySession(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}

// ---------- Cookies ----------
function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function isHttps(req) {
  return (req.headers["x-forwarded-proto"] || "").includes("https") || process.env.VERCEL === "1";
}

function setCookie(res, name, value, { maxAge, httpOnly = true, req }) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
  ];
  if (httpOnly) parts.push("HttpOnly");
  if (req && isHttps(req)) parts.push("Secure");
  if (typeof maxAge === "number") parts.push(`Max-Age=${maxAge}`);
  appendHeader(res, "Set-Cookie", parts.join("; "));
}

function clearCookie(res, name, req) {
  setCookie(res, name, "", { maxAge: 0, req });
}

function appendHeader(res, name, value) {
  const existing = res.getHeader(name);
  if (!existing) {
    res.setHeader(name, value);
  } else if (Array.isArray(existing)) {
    res.setHeader(name, [...existing, value]);
  } else {
    res.setHeader(name, [existing, value]);
  }
}

async function setSessionCookie(res, req, payload) {
  const token = await signSession(payload);
  setCookie(res, SESSION_COOKIE, token, { maxAge: SESSION_TTL_SECONDS, httpOnly: true, req });
}

async function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

function clearSessionCookie(res, req) {
  clearCookie(res, SESSION_COOKIE, req);
}

// ---------- CSRF (double-submit cookie), pour les actions admin authentifiées ----------
function issueCsrfToken(res, req) {
  const token = crypto.randomBytes(24).toString("hex");
  setCookie(res, CSRF_COOKIE, token, { maxAge: SESSION_TTL_SECONDS, httpOnly: false, req });
  return token;
}
function verifyCsrf(req) {
  const cookies = parseCookies(req);
  const header = req.headers["x-csrf-token"];
  return Boolean(cookies[CSRF_COOKIE]) && cookies[CSRF_COOKIE] === header;
}

// ---------- Misc ----------
function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error("INVALID_JSON")); }
    });
    req.on("error", reject);
  });
}

function requireRole(session, roles) {
  return Boolean(session && roles.includes(session.role));
}

module.exports = {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  getSession,
  clearSessionCookie,
  issueCsrfToken,
  verifyCsrf,
  getClientIp,
  readJsonBody,
  requireRole,
};
