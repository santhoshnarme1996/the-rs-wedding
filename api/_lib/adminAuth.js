import crypto from "node:crypto";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const getAdminConfig = () => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const accountsJson = process.env.ADMIN_ACCOUNTS_JSON;

  if (!secret) {
    const error = new Error("Admin credentials are not configured");
    error.code = "ADMIN_CONFIG_MISSING";
    throw error;
  }

  if (accountsJson) {
    return { accounts: JSON.parse(accountsJson), secret };
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    const error = new Error("Admin credentials are not configured");
    error.code = "ADMIN_CONFIG_MISSING";
    throw error;
  }

  return {
    accounts: [{ username, password, family: "all", role: "superadmin" }],
    secret,
  };
};

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const sign = (payload, secret) =>
  crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export const createAdminToken = (account) => {
  const { secret } = getAdminConfig();
  const payload = Buffer.from(JSON.stringify({
    sub: account.username,
    family: account.family || "all",
    role: account.role || "family_admin",
    exp: Date.now() + TOKEN_TTL_MS,
  })).toString("base64url");

  return `${payload}.${sign(payload, secret)}`;
};

export const validateAdminCredentials = (username, password) => {
  const config = getAdminConfig();
  const account = config.accounts.find((candidate) => safeEqual(username, candidate.username));

  if (!account || !safeEqual(password, account.password)) {
    return null;
  }

  return {
    username: account.username,
    family: account.family || "all",
    role: account.role || "family_admin",
  };
};

export const requireAdmin = (request, response) => {
  const { secret } = getAdminConfig();
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const [payload, signature] = token.split(".");

  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) {
    response.status(401).json({ error: "Unauthorized" });
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    if (!claims.exp || claims.exp < Date.now()) {
      response.status(401).json({ error: "Session expired" });
      return null;
    }

    return claims;
  } catch {
    response.status(401).json({ error: "Unauthorized" });
    return null;
  }
};

export const handleAdminError = (error, response) => {
  console.error(error);

  if (error.code === "ADMIN_CONFIG_MISSING") {
    return response.status(500).json({
      error: "Admin credentials are not configured in Vercel.",
      code: "ADMIN_CONFIG_MISSING",
    });
  }

  return response.status(500).json({ error: "Something went wrong with admin auth." });
};
