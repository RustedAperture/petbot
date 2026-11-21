// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/leaderboard/route";
import { createSessionCookieValue } from "@/lib/internal-api";

const upstream = vi.fn();
beforeEach(() => {
  upstream.mockReset().mockImplementation(async () =>
    Response.json({
      locationId: null,
      actionType: null,
      entries: [
        {
          userId: "123",
          rank: 1,
          displayName: null,
          anonymousLabel: "abcdef",
          totalActions: 42,
        },
      ],
    }),
  );
  vi.stubGlobal("fetch", upstream);
});
afterEach(() => vi.unstubAllGlobals());

it.each(["", "petbot_session=invalid"])(
  "allows anonymous global results without exposing IDs (%s)",
  async (cookie) => {
    const response = await GET(
      new Request(
        "http://localhost/api/leaderboard?actionType=pet&limit=5&currentUserId=999",
        { headers: { cookie } },
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.entries).toEqual([
      {
        rank: 1,
        displayName: null,
        anonymousLabel: "abcdef",
        totalActions: 42,
        isCurrentUser: false,
      },
    ]);
    const url = new URL(upstream.mock.calls[0][0]);
    expect(url.searchParams.get("currentUserId")).toBeNull();
    expect(url.searchParams.get("actionType")).toBe("pet");
    expect(url.searchParams.get("limit")).toBe("5");
  },
);

it.each(["?locationId=456", "?locationId=456&scope=guild"])(
  "requires authentication for location results (%s)",
  async (query) => {
    const response = await GET(
      new Request(`http://localhost/api/leaderboard${query}`),
    );
    expect(response.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  },
);

function signedRequest(query: string) {
  const cookie = createSessionCookieValue({ user: { id: "123" }, guilds: [] });
  return new Request(`http://localhost/api/leaderboard${query}`, {
    headers: { cookie: `petbot_session=${cookie}` },
  });
}

it("preserves personalization for authenticated global results", async () => {
  const response = await GET(signedRequest(""));
  expect(response.status).toBe(200);
  expect((await response.json()).entries[0].isCurrentUser).toBe(true);
  expect(
    new URL(upstream.mock.calls[0][0]).searchParams.get("currentUserId"),
  ).toBe("123");
});

it("still rejects guild results for non-members", async () => {
  const response = await GET(signedRequest("?locationId=456&scope=guild"));
  expect(response.status).toBe(403);
  expect(upstream).not.toHaveBeenCalled();
});

function memberRequest(query: string, guilds: Array<{ id: string }>) {
  const cookie = createSessionCookieValue({ user: { id: "123" }, guilds });
  return new Request(`http://localhost/api/leaderboard${query}`, {
    headers: { cookie: `petbot_session=${cookie}` },
  });
}

function routeUpstream(stats: unknown) {
  upstream.mockImplementation(async (url: string) =>
    String(url).includes("/api/stats/user/")
      ? Response.json(stats)
      : Response.json({ locationId: "456", actionType: null, entries: [] }),
  );
}

const noActivity = { totalsByAction: {} };
const someActivity = {
  totalsByAction: { pet: { totalHasPerformed: 2, totalUsers: 1 } },
};

it("rejects a non-member guild location sent with a DM label", async () => {
  routeUpstream(noActivity);
  const response = await GET(memberRequest("?locationId=456", []));
  expect(response.status).toBe(403);
  expect(
    upstream.mock.calls.some(([u]) => String(u).includes("/api/leaderboard")),
  ).toBe(false);
});

it.each(["", "&scope=guild"])(
  "allows a guild member to read their guild (%s)",
  async (extra) => {
    routeUpstream(noActivity);
    const response = await GET(
      memberRequest(`?locationId=456${extra}`, [{ id: "456" }]),
    );
    expect(response.status).toBe(200);
  },
);

it("allows a DM participant", async () => {
  routeUpstream(someActivity);
  const response = await GET(memberRequest("?locationId=456", []));
  expect(response.status).toBe(200);
});

it("rejects a DM label that claims guild scope for a DM location", async () => {
  routeUpstream(someActivity);
  const response = await GET(memberRequest("?locationId=456&scope=guild", []));
  expect(response.status).toBe(403);
});
