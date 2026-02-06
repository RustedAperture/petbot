import fetch from "node-fetch";
import { lookup } from "dns/promises";
import net from "net";

const DEFAULT_TIMEOUT_MS = 5000;

function isIPv4Private(ip: string) {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true; // 0.x.x.x
  return false;
}

function isIPv6Private(ip: string) {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  // IPv4-mapped IPv6 addresses ::ffff:127.0.0.1
  const idx = lower.lastIndexOf(":");
  if (idx !== -1) {
    const tail = lower.slice(idx + 1);
    if (tail.includes(".")) {
      return isIPv4Private(tail);
    }
  }
  return false;
}

async function resolvesToPrivateAddress(hostname: string) {
  // direct IP literal
  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname)) return isIPv4Private(hostname);
    if (net.isIPv6(hostname)) return isIPv6Private(hostname);
    return true;
  }

  // hostname like 'localhost'
  if (hostname === "localhost") return true;

  try {
    const addrs = await lookup(hostname, { all: true });
    for (const a of addrs) {
      if (net.isIPv4(a.address) && isIPv4Private(a.address)) return true;
      if (net.isIPv6(a.address) && isIPv6Private(a.address)) return true;
    }
  } catch (e) {
    // DNS lookup failed; don't treat as private by default
    return false;
  }

  return false;
}

export async function checkImage(urlStr: string) {
  try {
    const url = new URL(urlStr);

    // only allow http/https
    if (!["http:", "https:"].includes(url.protocol)) return false;

    const hostname = url.hostname.toLowerCase();

    // optional allowlist via env var: comma separated hosts (example.com or cdn.example.com)
    const allowedEnv = process.env.ALLOWED_IMAGE_HOSTS;
    if (allowedEnv) {
      const allowed = allowedEnv
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const ok = allowed.some((a) => hostname === a || hostname.endsWith(`.${a}`));
      if (!ok) return false;
    }

    if (await resolvesToPrivateAddress(hostname)) return false;

    // fetch with timeout and disallow redirects
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    // node-fetch v3 supports "redirect: 'manual'" and provides the status
    const res = await fetch(url.toString(), {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
    } as any);

    clearTimeout(timeout);

    // if redirect -> disallow
    if (res.status >= 300 && res.status < 400) return false;

    const contentType = res.headers.get("content-type") || "";
    return res.ok && contentType.startsWith("image/");
  } catch (e) {
    return false;
  }
}

export default { checkImage };
