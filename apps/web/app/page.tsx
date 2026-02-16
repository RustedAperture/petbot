import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left justify-center">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Welcome to PetBot!
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            PetBot is a fun Discord bot for interacting with other users. Use
            the sidebar to explore stats for the global bot, a specific guild,
            or your own personal stats! You will need to sign in with Discord to
            view guild or user stats.
          </p>
        </div>
      </main>
    </div>
  );
}
