import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSession } from "@/hooks/use-session";

function SessionStatus({ name }: { name: string }) {
  const { session, loading } = useSession();
  return (
    <p data-testid={name}>
      {loading ? "Loading" : session ? "Signed in" : "Signed out"}
    </p>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("settles every consumer when a shared session request finds no session", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ session: null }),
    })),
  );

  render(
    <>
      <SessionStatus name="first" />
      <SessionStatus name="second" />
    </>,
  );

  await waitFor(() => {
    expect(screen.getByTestId("first")).toHaveTextContent("Signed out");
    expect(screen.getByTestId("second")).toHaveTextContent("Signed out");
  });
});
