import crypto from "node:crypto";

/**
 * Compute a SHA-256 digest buffer from a string.
 */
export function sha256buf(s: string): Buffer {
  return crypto.createHash("sha256").update(String(s)).digest();
}

/**
 * Timing-safe string comparison using SHA-256 digests.
 * Returns false if either input is missing or if hashing fails.
 */
export function secureEqual(a?: string, b?: string): boolean {
  if (!a || !b) {
    return false;
  }
  try {
    const ah = sha256buf(a);
    const bh = sha256buf(b);
    return crypto.timingSafeEqual(ah, bh);
  } catch {
    return false;
  }
}

/**
 * Hash a user ID for anonymous display and consent lookup.
 * Returns the first `len` hex characters of the SHA-256 digest.
 */
export function hashUserId(userId: string, len = 16): string {
  return crypto.createHash("sha256").update(userId).digest("hex").slice(0, len);
}
