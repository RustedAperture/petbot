// @vitest-environment happy-dom
/// <reference lib="dom" />

// Required for React's act() to work outside of a full testing-library setup
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { it, expect, vi, beforeEach } from "vitest";
import { createElement, act } from "react";
import { createRoot } from "react-dom/client";

import ChangelogPage from "../../../apps/web/app/changelog/page.js";
const ChangelogPageAny = ChangelogPage as any;

// Mock Select to avoid @base-ui/react multi-React-instance crash
vi.mock("../../../apps/web/components/ui/select.js", () => {
  const React = require("react");
  return {
    __esModule: true,
    Select: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    SelectTrigger: ({ children }: any) =>
      React.createElement("div", null, children),
    SelectContent: ({ children }: any) =>
      React.createElement("div", null, children),
    SelectItem: ({ children, value }: any) =>
      React.createElement("div", { "data-value": value }, children),
    SelectValue: ({ placeholder }: any) =>
      React.createElement("span", null, placeholder),
  };
});

// mock fetch to return simple changelog text
const sample = "## v1.0.0 - 2026-03-10\n- Initial\n";

beforeEach(() => {
  // stubGlobal ensures the original is saved and can be restored by unstubAllGlobals
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: async () => sample,
    }),
  );
});

afterEach(() => {
  // restore any globals we stubbed to avoid leaks across tests
  vi.unstubAllGlobals();
});

it("mobile view shows cards and hides timeline", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(() => <ChangelogPageAny />));
    // flush microtasks so the fetch() Promise resolves and state updates apply
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });

  // timeline component should not appear
  expect(container.querySelector(".interactive-timeline")).toBeNull();
  // mobile cards now use same styling as timeline entries (bg-card etc)
  const card = container.querySelector(".bg-card");
  expect(card).toBeTruthy();
  // and we should see the version title and change text
  expect(container.textContent).toContain("v1.0.0");
  expect(container.textContent).toContain("Initial");

  await act(async () => root.unmount());
  container.remove();
});
