import TripFinder from "./components/TripFinder";

export default function Home() {
  return (
    <div className="min-h-screen bg-sky-50 dark:bg-slate-900">
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-teal-800 dark:text-teal-200 sm:text-4xl">
            SmartPack
          </h1>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-lg shadow-sky-200/50 dark:bg-slate-800 dark:shadow-none sm:p-8">
          <TripFinder />
        </section>
      </main>
    </div>
  );
}
