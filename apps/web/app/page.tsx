"use client";

import { buttonVariants } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ChartNoAxesCombined,
  Coffee,
  GitFork,
  LogIn,
  Palette,
  UserRound,
} from "lucide-react";

export default function Home() {
  const { session } = useSession();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-12 sm:px-8 sm:pt-24">
      <section aria-labelledby="welcome-title" className="max-w-3xl">
        <h1
          id="welcome-title"
          className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl"
        >
          Welcome to PetBot!
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          Explore the actions people share with PetBot on Discord. See what is
          happening across the bot, then sign in to explore your own stats and
          servers.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/globalStats" className={buttonVariants({ size: "lg" })}>
            <ChartNoAxesCombined aria-hidden="true" />
            View global stats
          </Link>
          {session ? (
            <Link
              href="/userStats"
              className={buttonVariants({ size: "lg", variant: "secondary" })}
            >
              <UserRound aria-hidden="true" />
              My stats
            </Link>
          ) : (
            <Link
              href="/api/auth/discord"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-[#5865F2] text-white hover:bg-[#4752C4]",
              )}
            >
              <LogIn aria-hidden="true" />
              Sign in with Discord
            </Link>
          )}
        </div>
      </section>

      <section
        aria-labelledby="support-title"
        className="mt-16 max-w-3xl border-t pt-10"
      >
        <h2
          id="support-title"
          className="text-2xl font-semibold tracking-tight"
        >
          How to Support PetBot
        </h2>
        <p className="mt-4 leading-7 text-muted-foreground">
          If you enjoy PetBot, you can support its development through Ko-fi or
          commission a &quot;your character here&quot; (YCH) for bot actions via
          Zimbi&apos;s Ko-fi. Bug reports, suggestions, and code contributions
          on GitHub are welcome too.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Contributors and supporters are credited in the changelog.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="https://ko-fi.com/walnutfox"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[#50ACED] text-black hover:bg-[#61bcfe]",
            )}
          >
            <Coffee aria-hidden="true" />
            Tip PetBot Development
          </Link>
          <Link
            href="https://ko-fi.com/zimbi"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-[#ffa500] text-black hover:bg-[#ffb844]",
            )}
          >
            <Palette aria-hidden="true" />
            Commission a YCH
          </Link>
          <Link
            href="https://github.com/RustedAperture/petbot"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-white text-black hover:bg-zinc-100",
            )}
          >
            <GitFork aria-hidden="true" />
            GitHub
          </Link>
        </div>
      </section>
    </main>
  );
}
