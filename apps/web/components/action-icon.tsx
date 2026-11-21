import type { CSSProperties } from "react";
import {
  ArrowDownToLine,
  Cookie,
  Flame,
  Hammer,
  Hand,
  Heart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_STYLES: Record<string, { icon: LucideIcon; color: string }> = {
  pet: { icon: Hand, color: "var(--chart-2)" },
  hug: { icon: Heart, color: "var(--chart-1)" },
  bonk: { icon: Hammer, color: "var(--chart-3)" },
  bite: { icon: Cookie, color: "var(--chart-4)" },
  squish: { icon: ArrowDownToLine, color: "var(--chart-5)" },
  explode: { icon: Flame, color: "var(--destructive)" },
};
const OTHER_STYLE = { icon: Sparkles, color: "var(--muted-foreground)" };

/** Icon and theme colour for an action type, with a neutral fallback for unknown types. */
export function actionStyle(actionType: string) {
  return Object.hasOwn(ACTION_STYLES, actionType)
    ? ACTION_STYLES[actionType]
    : OTHER_STYLE;
}

/** Decorative tinted tile showing an action's icon in its colour. */
export function ActionIcon({
  actionType,
  className,
}: {
  actionType: string;
  className?: string;
}) {
  const { icon: Icon, color } = actionStyle(actionType);
  return (
    <span
      aria-hidden="true"
      style={{ "--act": color } as CSSProperties}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--act)_18%,transparent)] text-[var(--act)] [&_svg]:size-4",
        className,
      )}
    >
      <Icon />
    </span>
  );
}
