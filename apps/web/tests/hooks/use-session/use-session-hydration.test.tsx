import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { useSession } from "@/hooks/use-session";

function SessionStatus() {
  const { session, loading } = useSession();
  return <p>{loading ? "Loading" : session ? "Signed in" : "Signed out"}</p>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renders the same first frame on server and client with a cached session", () => {
  const cached = JSON.stringify({
    session: { user: { id: "123", username: "Tester" }, guilds: [] },
    expiresAt: Date.now() + 60_000,
  });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "petbot_session_cache_v1" ? cached : null,
    removeItem: () => {},
  });

  const browserWindow = window;
  vi.stubGlobal("window", undefined);
  const serverMarkup = renderToString(<SessionStatus />);
  vi.stubGlobal("window", browserWindow);
  const clientMarkup = renderToString(<SessionStatus />);

  expect(clientMarkup).toBe(serverMarkup);
});
