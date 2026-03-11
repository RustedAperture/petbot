// @vitest-environment happy-dom
/// <reference lib="dom" />

import { it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

import ChangelogPage from "../../../apps/web/app/changelog/page.js";
const ChangelogPageAny = ChangelogPage as any;

// stub mobile hook so page thinks it's phone
vi.mock("../../../apps/web/hooks/use-mobile.js", () => ({
  useIsMobile: () => true,
}));

// mock fetch to return simple changelog text
const sample = "## v1.0.0 - 2026-03-10\n- Initial\n";

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => sample,
  });
});

it("mobile view shows cards and hides timeline", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await new Promise<void>((resolve) => {
    root.render(createElement(() => <ChangelogPageAny />));
    // wait a tick for effect
    setTimeout(() => resolve(), 0);
  });

  // timeline component should not appear
  expect(container.querySelector(".interactive-timeline")).toBeNull();
  // mobile cards now use same styling as timeline entries (bg-card etc)
  const card = container.querySelector(".bg-card");
  expect(card).toBeTruthy();
  // and we should see the version title and change text
  expect(container.textContent).toContain("v1.0.0");
  expect(container.textContent).toContain("Initial");

  root.unmount();
  container.remove();
});
