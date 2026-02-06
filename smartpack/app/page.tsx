import Image from "next/image";
import TripFinder from "./components/TripFinder";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              className="dark:invert"
              src="/next.svg"
              alt="SmartPack"
              width={96}
              height={20}
              priority
            />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            SmartPack
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Tell us about your trip — we&apos;ll suggest what to pack.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <TripFinder />
        </section>

        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
          CS 125 · Recommendation engine uses trip dates, location, activities &
          weather to rank items.
        </p>
      </main>
    </div>
  );
}
