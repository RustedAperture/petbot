"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/hooks/use-session";
import Link from "next/link";
import { Coffee, Palette, Github } from "lucide-react";

export default function Home() {
  const { session, loading } = useSession();

  let message =
    "PetBot is a fun Discord bot for interacting with other users. Use the sidebar to explore stats for the global bot, a specific guild, or your own personal stats!";
  if (!session && !loading) {
    message +=
      " You will need to sign in with Discord to view guild or user stats.";
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <main className="flex min-h-screen w-full flex-col items-center justify-between py-32 px-16">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left justify-center">
          <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
            Welcome to PetBot!
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
          <Separator />
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
            How to Support PetBot
          </h2>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            If you enjoy using PetBot, you can support the project by donating
            through Ko-fi. You can also commission a "your character here" (YCH)
            for bot actions via Zimbi's Ko-fi, which helps fund development and
            art assets.
          </p>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Another great way to help is by submitting bugs, suggesting
            improvements, or contributing code on GitHub.
          </p>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            We keep a "special thanks" section at the bottom of the changelog
            for bug reporters, feature suggesters, and tippers. Code
            contributors are credited on each release for the work they've done.
          </p>
          <div className="flex gap-2">
            <Button
              size="lg"
              className={"bg-[#50ACED] hover:scale-105 hover:bg-[#61bcfe]"}
              render={
                <Link
                  href="https://ko-fi.com/walnutfox"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Coffee />
                  Tip PetBot Development
                </Link>
              }
            />
            <Button
              size="lg"
              className={"bg-[#ffa500] hover:scale-105 hover:bg-[#ffb844]"}
              render={
                <Link
                  href="https://ko-fi.com/zimbi"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Palette />
                  Commission a YCH
                </Link>
              }
            />
            <Button
              size="lg"
              className={"bg-[#fff] hover:scale-105 hover:bg-[#fff]"}
              render={
                <Link
                  href="https://github.com/RustedAperture/petbot"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github />
                  GitHub
                </Link>
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
