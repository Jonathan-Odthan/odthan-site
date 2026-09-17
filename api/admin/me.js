const { getSession } = require("../_lib/security");
const { sendJson, methodNotAllowed, handleError } = require("../_lib/respond");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    const session = await getSession(req);
    if (!session) return sendJson(res, 401, { error: "NOT_AUTHENTICATED" });
    return sendJson(res, 200, { email: session.email, role: session.role });
  } catch (err) {
    return handleError(res, err);
  }
};
