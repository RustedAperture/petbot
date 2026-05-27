import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "petbot_session";
const SESSION_COOKIE_VERSION = "v1";
const DEV_SESSION_COOKIE_SECRET = "petbot-dev-session-secret";

export function readCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.split("=");
      return [k?.trim(), decodeURIComponent((v || []).join("=") || "")];
    }),
  );
  return cookies[SESSION_COOKIE_NAME];
}

function getSessionCookieSecret(): string | null {
  const secret = process.env.SESSION_COOKIE_SECRET || process.env.INTERNAL_API_SECRET;
  if (secret) {
    return secret;
  }
  return process.env.NODE_ENV === "production" ? null : DEV_SESSION_COOKIE_SECRET;
}

function signSessionPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionCookieValue(session: unknown): string {
  const secret = getSessionCookieSecret();
  if (!secret) {
    throw new Error("SESSION_COOKIE_SECRET or INTERNAL_API_SECRET is not set");
  }

  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  const signature = signSessionPayload(payload, secret);
  return `${SESSION_COOKIE_VERSION}.${payload}.${signature}`;
}

export function parseSessionCookieValue(raw: string): unknown | null {
  const secret = getSessionCookieSecret();
  if (!secret) {
    return null;
  }

  const [version, payload, signature] = raw.split(".");
  if (version !== SESSION_COOKIE_VERSION || !payload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(payload, secret);
  const actualBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function internalApiHeaders() {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is not set");
  }
  return { "x-internal-api-key": secret };
}

/** Like internalApiHeaders but returns empty object when secret is unset (dev mode). */
export function internalApiHeadersOptional(): Record<string, string> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("INTERNAL_API_SECRET is not set");
  }
  return secret ? { "x-internal-api-key": secret } : {};
}

export function getInternalApiBase() {
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL.replace(/\/$/, "");
  }
  const host = process.env.HTTP_HOST || "127.0.0.1";
  const port = process.env.HTTP_PORT || "3001";
  const preferHttps = Boolean(
    process.env.HTTP_TLS_CERT ||
    process.env.HTTP_TLS_KEY ||
    process.env.INTERNAL_API_USE_HTTPS === "1" ||
    process.env.INTERNAL_API_USE_HTTPS === "true" ||
    process.env.NODE_ENV === "production",
  );
  const protocol =
    preferHttps && host !== "127.0.0.1" && host !== "localhost"
      ? "https"
      : "http";
  return `${protocol}://${host}:${port}`;
}
