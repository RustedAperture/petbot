"use client";

import * as React from "react";
import { Images, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { cn } from "@/lib/utils";

type CardView = "compact" | "full";

type CardViewContextValue = {
  compact: boolean;
  setSelectedView: (view: CardView) => void;
};

const CardViewContext = React.createContext<CardViewContextValue | null>(null);

const MOBILE_QUERY = "(max-width: 639px)";
const STORAGE_KEYS = {
  mobile: "petbot.card-view.mobile",
  desktop: "petbot.card-view.desktop",
} as const;
const VIEW_CHANGE_EVENT = "petbot:card-view-change";

function readStoredView(key: string): CardView | null {
  try {
    const view = window.localStorage.getItem(key);
    return view === "compact" || view === "full" ? view : null;
  } catch {
    return null;
  }
}

function subscribeToStoredView(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(VIEW_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VIEW_CHANGE_EVENT, onChange);
  };
}

function getStoredMobileView() {
  return readStoredView(STORAGE_KEYS.mobile);
}

function getStoredDesktopView() {
  return readStoredView(STORAGE_KEYS.desktop);
}

function getServerView() {
  return null;
}

function subscribeToMobile(onChange: () => void) {
  if (typeof window.matchMedia !== "function") {
    return () => {};
  }
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isMobile() {
  return typeof window.matchMedia === "function"
    ? window.matchMedia(MOBILE_QUERY).matches
    : false;
}

export function StatsCardViewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mobile = React.useSyncExternalStore(
    subscribeToMobile,
    isMobile,
    () => false,
  );
  const storedMobileView = React.useSyncExternalStore(
    subscribeToStoredView,
    getStoredMobileView,
    getServerView,
  );
  const storedDesktopView = React.useSyncExternalStore(
    subscribeToStoredView,
    getStoredDesktopView,
    getServerView,
  );
  const [fallbackViews, setFallbackViews] = React.useState<{
    mobile: CardView | null;
    desktop: CardView | null;
  }>({ mobile: null, desktop: null });
  const selectedView = mobile
    ? (fallbackViews.mobile ?? storedMobileView ?? "compact")
    : (fallbackViews.desktop ?? storedDesktopView ?? "full");
  const compact = selectedView === "compact";

  function setSelectedView(view: CardView) {
    const device = mobile ? "mobile" : "desktop";
    try {
      window.localStorage.setItem(STORAGE_KEYS[device], view);
      window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
    } catch {
      setFallbackViews((current) => ({ ...current, [device]: view }));
    }
  }

  return (
    <CardViewContext.Provider value={{ compact, setSelectedView }}>
      {children}
    </CardViewContext.Provider>
  );
}

function useCardView() {
  const context = React.useContext(CardViewContext);
  if (!context) {
    throw new Error("StatsCardView requires StatsCardViewProvider");
  }
  return context;
}

export function StatsCardViewToggle() {
  const { compact, setSelectedView } = useCardView();

  return (
    <ButtonGroup aria-label="Card view">
      <Button
        type="button"
        size="icon"
        variant={compact ? "default" : "outline"}
        aria-label="Compact cards"
        aria-pressed={compact}
        title="Compact cards · hide images"
        onClick={() => setSelectedView("compact")}
      >
        <LayoutGrid aria-hidden="true" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant={compact ? "outline" : "default"}
        aria-label="Full cards"
        aria-pressed={!compact}
        title="Full cards · show images"
        onClick={() => setSelectedView("full")}
      >
        <Images aria-hidden="true" />
      </Button>
    </ButtonGroup>
  );
}

export default function StatsCardView({
  children,
  className,
}: {
  children: (compact: boolean) => React.ReactNode;
  className?: string;
}) {
  const { compact } = useCardView();

  return (
    <section aria-label="Action cards">
      <div
        className={cn(
          "grid gap-4",
          compact
            ? "grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          className,
        )}
      >
        {children(compact)}
      </div>
    </section>
  );
}
