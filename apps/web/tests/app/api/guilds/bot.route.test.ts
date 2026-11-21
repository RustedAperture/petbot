// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/guilds/bot/[guildId]/route";
import { createSessionCookieValue } from "@/lib/internal-api";

const upstream = vi.fn();
beforeEach(() => {
  upstream.mockReset().mockResolvedValue(
    Response.json({ isBotGuild: true, isBotMember: false }),
  );
  vi.stubGlobal("fetch", upstream);
});

function request(guilds: Array<{ id: string }>, withSession = true) {
  const cookie = createSessionCookieValue({ user: { id: "123" }, guilds });
  return new Request("http://localhost/api/guilds/bot/456", {
    headers: withSession ? { cookie: `petbot_session=${cookie}` } : {},
  });
}
const ctx = { params: Promise.resolve({ guildId: "456" }) };

describe("/api/guilds/bot/[guildId]", () => {
  it("requires a session", async () => {
    expect((await GET(request([], false), ctx)).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("forbids a guild outside the session's guilds", async () => {
    expect((await GET(request([{ id: "999" }]), ctx)).status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("relays the bot's answer for a session guild", async () => {
    const res = await GET(request([{ id: "456" }]), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isBotGuild: true, isBotMember: false });
    expect(String(upstream.mock.calls[0][0])).toContain("/api/guilds/bot/456");
  });
});
