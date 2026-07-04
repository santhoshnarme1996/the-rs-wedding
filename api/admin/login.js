import { createAdminToken, handleAdminError, validateAdminCredentials } from "../_lib/adminAuth.js";

const normalizeBody = (body) => {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body || {};
};

export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return response.status(405).json({ error: "Method not allowed." });
    }

    const { username = "", password = "" } = normalizeBody(request.body);

    const account = validateAdminCredentials(String(username), String(password));

    if (!account) {
      return response.status(401).json({ error: "Invalid admin credentials." });
    }

    return response.status(200).json({
      token: createAdminToken(account),
      account: {
        username: account.username,
        family: account.family,
        role: account.role,
      },
    });
  } catch (error) {
    return handleAdminError(error, response);
  }
}
