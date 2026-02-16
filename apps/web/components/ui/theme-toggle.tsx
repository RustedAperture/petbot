"use client";

import * as React from "react";
import { SunIcon, MoonIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const THEME_KEY = "theme";

export default function ThemeToggle() {
  // start `null` so server + initial client render are identical (prevents hydration mismatch)
  const [isDark, setIsDark] = React.useState<boolean | null>(null);

  // Read persisted preference (localStorage → cookie) or system preference on mount (client-only).
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "dark") {
        setIsDark(true);
        return;
      }
      if (stored === "light") {
        setIsDark(false);
        return;
      }

      // Fallback: check cookie (server may have written this)
      const cookieMatch = document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${THEME_KEY}=`));
      if (cookieMatch) {
        const val = cookieMatch.split("=")[1];
        if (val === "dark") {
          setIsDark(true);
          return;
        }
        if (val === "light") {
          setIsDark(false);
          return;
        }
      }

      // Default to dark mode when no explicit preference is stored
      setIsDark(true);
    } catch (e) {
      setIsDark(false);
    }
  }, []);

  // Apply theme to <html> and persist preference when known
  React.useEffect(() => {
    if (isDark === null) return; // don't modify DOM during SSR/initial render
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem(THEME_KEY, "dark");
      // persist for server-side rendering to match client on next request
      document.cookie = `${THEME_KEY}=dark; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } else {
      root.classList.remove("dark");
      localStorage.setItem(THEME_KEY, "light");
      document.cookie = `${THEME_KEY}=light; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
  }, [isDark]);

  // Keep in sync if preference is changed in another tab or by system preference
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");

    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        setIsDark(e.newValue === "dark");
      }
    };

    const onPrefChange = (ev: MediaQueryListEvent) => {
      // only update when user hasn't explicitly set a preference
      if (!localStorage.getItem(THEME_KEY)) setIsDark(ev.matches);
    };

    window.addEventListener("storage", onStorage);
    mq?.addEventListener?.("change", onPrefChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      mq?.removeEventListener?.("change", onPrefChange);
    };
  }, []);

  const toggle = React.useCallback(
    () => setIsDark((cur) => (cur === null ? true : !cur)),
    [],
  );

  const title =
    isDark === null
      ? "Toggle theme"
      : isDark
        ? "Switch to light mode"
        : "Switch to dark mode";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-pressed={isDark ?? false}
      title={title}
      data-testid="theme-toggle"
      className="h-8 w-8 p-0"
    >
      {/* Render a stable placeholder during SSR/initial render to avoid mismatch */}
      {isDark === null ? (
        <MoonIcon className="size-4 opacity-0" />
      ) : isDark ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
    </Button>
  );
}
