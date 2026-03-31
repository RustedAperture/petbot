import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock internal-api module
vi.mock("@/lib/internal-api", () => ({
  readCookie: vi.fn(),
  getInternalApiBase: vi.fn(() => "http://127.0.0.1:3001"),
  internalApiHeadersOptional: vi.fn(() => ({
    "x-internal-api-key": "test-key",
  })),
}));

import { readCookie } from "@/lib/internal-api";
import {
  requireSession,
  assertSelf,
  assertGuildMembership,
  resolveGuilds,
} from "@/lib/auth";

const mockReadCookie = vi.mocked(readCookie);

function makeRequest(): Request {
  return new Request("http://localhost/api/test");
}

function sessionCookie(session: object): string {
  return JSON.stringify(session);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("requireSession", () => {
  it("throws 401 when no cookie is present", () => {
    mockReadCookie.mockReturnValue(undefined as unknown as string);
    expect(() => requireSession(makeRequest())).toThrow();
    try {
      requireSession(makeRequest());
    } catch (res) {
      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(401);
    }
  });

  it("throws 401 when session JSON is invalid", () => {
    mockReadCookie.mockReturnValue("not-json");
    try {
      requireSession(makeRequest());
    } catch (res) {
      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(401);
    }
  });

  it("throws 401 when session has no user.id", () => {
    mockReadCookie.mockReturnValue(sessionCookie({ user: {} }));
    try {
      requireSession(makeRequest());
    } catch (res) {
      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(401);
    }
  });

  it("throws 401 when user.id is not a numeric string", () => {
    mockReadCookie.mockReturnValue(sessionCookie({ user: { id: "abc" } }));
    try {
      requireSession(makeRequest());
    } catch (res) {
      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(401);
    }
  });

  it("returns session when valid", () => {
    const session = { user: { id: "123456789" }, guilds: [] };
    mockReadCookie.mockReturnValue(sessionCookie(session));
    const result = requireSession(makeRequest());
    expect(result.user?.id).toBe("123456789");
  });
});

describe("assertSelf", () => {
  it("does not throw when userId matches session", () => {
    const session = { user: { id: "123" } };
    expect(() => assertSelf(session, "123")).not.toThrow();
  });

  it("throws 403 when userId does not match", () => {
    const session = { user: { id: "123" } };
    try {
      assertSelf(session, "456");
    } catch (res) {
      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(403);
    }
  });
});

describe("assertGuildMembership", () => {
  it("does not throw when guild is in session", () => {
    const session = { guilds: [{ id: "guild-1" }] };
    expect(() => assertGuildMembership(session, "guild-1")).not.toThrow();
  });

  it("throws 403 when guild is not in session", () => {
    const session = { guilds: [{ id: "guild-1" }] };
    try {
      assertGuildMembership(session, "guild-2");
    } catch (res) {
      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(403);
    }
  });

  it("throws 403 when session has no guilds", () => {
    const session = {};
    try {
      assertGuildMembership(session, "guild-1");
    } catch (res) {
      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(403);
    }
  });
});

describe("resolveGuilds", () => {
  it("returns guilds from session when present", async () => {
    const guilds = [{ id: "g1" }, { id: "g2" }];
    const session = { user: { id: "123" }, guilds };
    const result = await resolveGuilds(session);
    expect(result).toEqual(guilds);
  });

  it("fetches guilds from API when not in session", async () => {
    const session = { user: { id: "123" } };
    const fetchedGuilds = [{ id: "g3" }];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ guilds: fetchedGuilds }),
    });

    const result = await resolveGuilds(session);
    expect(result).toEqual(fetchedGuilds);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/userSessions/123",
      expect.objectContaining({
        headers: { "x-internal-api-key": "test-key" },
      }),
    );
  });

  it("returns empty array when API fetch fails", async () => {
    const session = { user: { id: "123" } };
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const result = await resolveGuilds(session);
    expect(result).toEqual([]);
  });

  it("returns empty array when API returns non-ok", async () => {
    const session = { user: { id: "123" } };
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const result = await resolveGuilds(session);
    expect(result).toEqual([]);
  });
});
