import TripFinder from "./components/TripFinder";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950">
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
            SmartPack
          </h1>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-md shadow-stone-200/80 dark:bg-stone-900 dark:shadow-none sm:p-8">
          <TripFinder />
        </section>
      </main>
    </div>
  );
}
