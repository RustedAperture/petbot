import * as React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSession } from "@/hooks/use-session";

function RefreshBeforeSubscriberEffects() {
  const { refresh } = useSession();
  React.useLayoutEffect(() => {
    void refresh();
  }, [refresh]);
  return null;
}

function SessionStatus() {
  const { session, loading } = useSession();
  return <p>{loading ? "Loading" : session ? "Signed in" : "Signed out"}</p>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("settles a consumer whose effects mount after the cache is filled", async () => {
  const cached = JSON.stringify({
    session: { user: { id: "123", username: "Tester" }, guilds: [] },
    expiresAt: Date.now() + 60_000,
  });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "petbot_session_cache_v1" ? cached : null,
    removeItem: () => {},
  });

  render(
    <>
      <RefreshBeforeSubscriberEffects />
      <SessionStatus />
    </>,
  );

  await waitFor(() => {
    expect(screen.getByText("Signed in")).toBeInTheDocument();
  });
});
