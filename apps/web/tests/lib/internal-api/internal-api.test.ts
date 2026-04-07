import { describe, it, expect, afterEach } from "vitest";
import {
  SESSION_COOKIE_NAME,
  internalApiHeaders,
  internalApiHeadersOptional,
  getInternalApiBase,
} from "@/lib/internal-api";

describe("SESSION_COOKIE_NAME", () => {
  it("is petbot_session", () => {
    expect(SESSION_COOKIE_NAME).toBe("petbot_session");
  });
});

describe("internalApiHeaders", () => {
  const originalSecret = process.env.INTERNAL_API_SECRET;

  afterEach(() => {
    process.env.INTERNAL_API_SECRET = originalSecret;
  });

  it("returns headers with API key when secret is set", () => {
    process.env.INTERNAL_API_SECRET = "test-secret";
    const headers = internalApiHeaders();
    expect(headers).toEqual({ "x-internal-api-key": "test-secret" });
  });

  it("throws when secret is not set", () => {
    delete process.env.INTERNAL_API_SECRET;
    expect(() => internalApiHeaders()).toThrow(
      "INTERNAL_API_SECRET is not set",
    );
  });
});

describe("internalApiHeadersOptional", () => {
  const originalSecret = process.env.INTERNAL_API_SECRET;

  afterEach(() => {
    process.env.INTERNAL_API_SECRET = originalSecret;
  });

  it("returns headers with API key when secret is set", () => {
    process.env.INTERNAL_API_SECRET = "test-secret";
    const headers = internalApiHeadersOptional();
    expect(headers).toEqual({ "x-internal-api-key": "test-secret" });
  });

  it("returns empty object when secret is not set", () => {
    delete process.env.INTERNAL_API_SECRET;
    const headers = internalApiHeadersOptional();
    expect(headers).toEqual({});
  });
});

describe("getInternalApiBase", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it("uses INTERNAL_API_URL when set", () => {
    process.env.INTERNAL_API_URL = "https://api.example.com";
    expect(getInternalApiBase()).toBe("https://api.example.com");
  });

  it("strips trailing slash from INTERNAL_API_URL", () => {
    process.env.INTERNAL_API_URL = "https://api.example.com/";
    expect(getInternalApiBase()).toBe("https://api.example.com");
  });

  it("defaults to http://127.0.0.1:3001 when no env vars set", () => {
    delete process.env.INTERNAL_API_URL;
    delete process.env.HTTP_HOST;
    delete process.env.HTTP_PORT;
    delete process.env.HTTP_TLS_CERT;
    delete process.env.HTTP_TLS_KEY;
    delete process.env.INTERNAL_API_USE_HTTPS;
    process.env.NODE_ENV = "test";
    expect(getInternalApiBase()).toBe("http://127.0.0.1:3001");
  });

  it("uses custom HTTP_HOST and HTTP_PORT", () => {
    delete process.env.INTERNAL_API_URL;
    process.env.HTTP_HOST = "0.0.0.0";
    process.env.HTTP_PORT = "8080";
    delete process.env.HTTP_TLS_CERT;
    delete process.env.HTTP_TLS_KEY;
    delete process.env.INTERNAL_API_USE_HTTPS;
    process.env.NODE_ENV = "test";
    expect(getInternalApiBase()).toBe("http://0.0.0.0:8080");
  });

  it("uses https in production with non-localhost host", () => {
    delete process.env.INTERNAL_API_URL;
    process.env.HTTP_HOST = "api.example.com";
    process.env.HTTP_PORT = "443";
    process.env.NODE_ENV = "production";
    expect(getInternalApiBase()).toBe("https://api.example.com:443");
  });

  it("stays http for localhost even in production", () => {
    delete process.env.INTERNAL_API_URL;
    process.env.HTTP_HOST = "localhost";
    process.env.HTTP_PORT = "3001";
    process.env.NODE_ENV = "production";
    expect(getInternalApiBase()).toBe("http://localhost:3001");
  });

  it("uses https when INTERNAL_API_USE_HTTPS is true", () => {
    delete process.env.INTERNAL_API_URL;
    process.env.HTTP_HOST = "api.example.com";
    process.env.HTTP_PORT = "443";
    process.env.INTERNAL_API_USE_HTTPS = "true";
    process.env.NODE_ENV = "test";
    expect(getInternalApiBase()).toBe("https://api.example.com:443");
  });
});
