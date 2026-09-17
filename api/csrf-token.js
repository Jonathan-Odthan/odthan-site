const { issueCsrfToken } = require("./_lib/security");
const { sendJson, methodNotAllowed } = require("./_lib/respond");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const token = issueCsrfToken(res, req);
  return sendJson(res, 200, { csrfToken: token });
};
