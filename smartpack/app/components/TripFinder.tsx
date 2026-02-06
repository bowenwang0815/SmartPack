"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  getPackingRecommendations,
  MOCK_ITEM_CATALOG,
  type RankedItem,
  type TripContext,
} from "@/lib/recommendation";
import {
  searchLocations,
  formatLocationLabel,
  type LocationResult,
} from "@/lib/locationSearch";
import { fetchWeatherTags } from "@/lib/weather";

const ACTIVITIES = [
  { id: "beach", label: "Beach" },
  { id: "hiking", label: "Hiking" },
  { id: "business", label: "Business" },
  { id: "nightlife", label: "Nightlife" },
  { id: "snow", label: "Snow / winter" },
  { id: "casual", label: "Casual / city" },
] as const;

const WEATHER_OPTIONS = [
  { id: "hot", label: "Hot / sunny" },
  { id: "cold", label: "Cold" },
  { id: "rain", label: "Rainy" },
  { id: "snow", label: "Snowy" },
  { id: "windy", label: "Windy" },
] as const;

interface TripForm {
  destination: string;
  startDate: string;
  endDate: string;
  activities: string[];
  luggageType: "carry-on" | "checked";
  laundryAccess: "none" | "limited" | "available";
  weatherTags: string[];
  packingPreference: number;
  tempPreference: "runs_cold" | "neutral" | "runs_warm";
  /** Set when user selects a location from dropdown; used for weather API. */
  latitude?: number;
  longitude?: number;
}

const defaultForm: TripForm = {
  destination: "",
  startDate: "",
  endDate: "",
  activities: [],
  luggageType: "carry-on",
  laundryAccess: "none",
  weatherTags: [],
  packingPreference: 0.5,
  tempPreference: "neutral",
};

function getTripLengthDays(start: string, end: string): number {
  if (!start || !end) return 5;
  const a = new Date(start);
  const b = new Date(end);
  const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(diff + 1, 90));
}

function formToTripContext(form: TripForm, weatherTagsOverride?: string[]): TripContext {
  const tripLengthDays = getTripLengthDays(form.startDate, form.endDate);
  const weatherTags = weatherTagsOverride ?? form.weatherTags;
  return {
    tripLengthDays,
    activities: form.activities,
    weatherTags,
    luggageType: form.luggageType,
    laundryAccess: form.laundryAccess,
    packingPreference: form.packingPreference,
    tempPreference: form.tempPreference,
  };
}

const STEPS = [
  { id: "where", title: "Where & when", subtitle: "Destination and dates" },
  { id: "activities", title: "What will you do?", subtitle: "Select your activities" },
  { id: "luggage", title: "How are you traveling?", subtitle: "Luggage type" },
  { id: "laundry", title: "Laundry access?", subtitle: "Affects how much to pack" },
  { id: "style", title: "Weather & packing style", subtitle: "So we can tailor your list" },
] as const;

const DEBOUNCE_MS = 300;

export default function TripFinder() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TripForm>(defaultForm);
  const [results, setResults] = useState<RankedItem[] | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationWrapperRef = useRef<HTMLDivElement>(null);

  const totalSteps = STEPS.length;
  const isLastStep = step === totalSteps - 1;
  const isComplete = results !== null;

  const update = (patch: Partial<TripForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  // Debounced location search (state updates only inside timeout to avoid sync setState in effect)
  useEffect(() => {
    const query = form.destination.trim();
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(() => {
      if (query.length < 2) {
        setLocationSuggestions([]);
        setShowLocationDropdown(false);
        return;
      }
      setLocationLoading(true);
      searchLocations(form.destination)
        .then((results) => {
          setLocationSuggestions(results);
          setShowLocationDropdown(results.length > 0);
        })
        .catch(() => setLocationSuggestions([]))
        .finally(() => setLocationLoading(false));
    }, query.length < 2 ? 0 : DEBOUNCE_MS);
    return () => {
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    };
  }, [form.destination]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(e.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectLocation = useCallback((loc: LocationResult) => {
    update({
      destination: formatLocationLabel(loc),
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    setLocationSuggestions([]);
    setShowLocationDropdown(false);
  }, []);

  const toggleActivity = (id: string) => {
    setForm((prev) => ({
      ...prev,
      activities: prev.activities.includes(id)
        ? prev.activities.filter((a) => a !== id)
        : [...prev.activities, id],
    }));
  };

  const toggleWeather = (id: string) => {
    setForm((prev) => ({
      ...prev,
      weatherTags: prev.weatherTags.includes(id)
        ? prev.weatherTags.filter((t) => t !== id)
        : [...prev.weatherTags, id],
    }));
  };

  const goNext = async () => {
    if (isLastStep) {
      setWeatherError(null);
      setResultsLoading(true);
      let weatherTags: string[] = form.weatherTags;
      if (
        form.latitude != null &&
        form.longitude != null &&
        form.startDate &&
        form.endDate
      ) {
        try {
          const fetched = await fetchWeatherTags(
            form.latitude,
            form.longitude,
            form.startDate,
            form.endDate
          );
          if (fetched.length > 0) weatherTags = fetched;
        } catch {
          setWeatherError("Could not load forecast; using your selections.");
        }
      }
      const context = formToTripContext(form, weatherTags);
      const ranked = getPackingRecommendations(context, MOCK_ITEM_CATALOG);
      setResults(ranked);
      setResultsLoading(false);
    } else {
      setStep((s) => Math.min(s + 1, totalSteps - 1));
    }
  };

  const goBack = () => {
    if (results) {
      setResults(null);
    } else {
      setStep((s) => Math.max(0, s - 1));
    }
  };

  const startOver = () => {
    setStep(0);
    setForm(defaultForm);
    setResults(null);
    setWeatherError(null);
  };

  if (isComplete && results) {
    const top3 = results.filter((r) => r.tier === "essential").slice(0, 3);
    const suggested = results.filter((r) => r.tier === "suggested").slice(0, 8);
    const optional = results.filter((r) => r.tier === "optional").slice(0, 6);
    const days = getTripLengthDays(form.startDate, form.endDate);

    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Your packing list
          </h2>
          <button
            type="button"
            onClick={startOver}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Start over
          </button>
        </div>
        {form.destination && (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            {form.destination}
            {days > 0 && ` · ${days} day${days !== 1 ? "s" : ""}`}
          </p>
        )}

        <section className="mb-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Must bring
          </h3>
          <ul className="space-y-2">
            {top3.map((r) => (
              <li
                key={r.item.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {r.item.name}
                  </span>
                  <span className="ml-2 text-zinc-500">×{r.suggestedQuantity}</span>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {r.reason}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Suggested
          </h3>
          <ul className="space-y-1.5">
            {suggested.map((r) => (
              <li
                key={r.item.id}
                className="flex items-center justify-between rounded-md bg-zinc-50 py-2 px-3 dark:bg-zinc-800"
              >
                <span className="text-zinc-800 dark:text-zinc-200">
                  {r.item.name}
                </span>
                <span className="text-sm text-zinc-500">
                  ×{r.suggestedQuantity} · {r.reason}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Optional
          </h3>
          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {optional.map((r) => (
              <li key={r.item.id}>
                {r.item.name} ×{r.suggestedQuantity} — {r.reason}
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            Step {step + 1} of {totalSteps}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-8 min-h-[260px]">
        {step === 0 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Where are you going?
            </h3>
            <div ref={locationWrapperRef} className="relative">
              <input
                type="text"
                placeholder="e.g. Irvine, Miami, London"
                value={form.destination}
                onChange={(e) => {
                  update({
                    destination: e.target.value,
                    latitude: undefined,
                    longitude: undefined,
                  });
                  if (!e.target.value.trim()) setShowLocationDropdown(false);
                }}
                onFocus={() => {
                  if (locationSuggestions.length > 0) setShowLocationDropdown(true);
                }}
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              {locationLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                  Searching…
                </span>
              )}
              {showLocationDropdown && locationSuggestions.length > 0 && (
                <ul
                  className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
                  role="listbox"
                >
                  {locationSuggestions.map((loc) => (
                    <li
                      key={`${loc.id}-${loc.name}-${loc.admin1 ?? ""}-${loc.country}`}
                      role="option"
                      aria-selected={false}
                      tabIndex={0}
                      onClick={() => selectLocation(loc)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          selectLocation(loc);
                        }
                      }}
                      className="cursor-pointer px-4 py-2.5 text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      {formatLocationLabel(loc)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              When?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Start
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  End
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update({ endDate: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              What will you do on your trip?
            </h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Select all that apply.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACTIVITIES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleActivity(a.id)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    form.activities.includes(a.id)
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              How are you traveling?
            </h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Affects how much we suggest packing.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: "carry-on" as const, label: "Carry-on only", desc: "Keep it minimal" },
                  { id: "checked" as const, label: "Checked bag", desc: "More room to pack" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => update({ luggageType: opt.id })}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    form.luggageType === opt.id
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                      : "border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-800"
                  }`}
                >
                  <span className="block font-medium text-zinc-900 dark:text-zinc-50">
                    {opt.label}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Will you have laundry access?
            </h3>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              We&apos;ll suggest fewer clothes if you can do laundry.
            </p>
            <div className="space-y-2">
              {(
                [
                  { id: "none" as const, label: "No laundry" },
                  { id: "limited" as const, label: "Limited (e.g. sink)" },
                  { id: "available" as const, label: "Laundry available" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => update({ laundryAccess: opt.id })}
                  className={`w-full rounded-lg border px-4 py-3 text-left font-medium transition-colors ${
                    form.laundryAccess === opt.id
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200"
                      : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Weather
              </h3>
              {form.latitude != null && form.longitude != null && form.startDate && form.endDate ? (
                <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                  We&apos;ll use the forecast for your destination and dates. Or override below if you prefer.
                </p>
              ) : (
                <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Select expected weather (or pick a location with dates on step 1 to use live forecast).
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {WEATHER_OPTIONS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWeather(w.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      form.weatherTags.includes(w.id)
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                Packing style
              </h3>
              <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                Pack light ↔ Pack prepared
              </p>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={form.packingPreference}
                onChange={(e) =>
                  update({ packingPreference: parseFloat(e.target.value) })
                }
                className="w-full accent-blue-600"
              />
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                Do you run cold or warm?
              </h3>
              <div className="flex gap-2">
                {(
                  [
                    { id: "runs_cold" as const, label: "Run cold" },
                    { id: "neutral" as const, label: "Neutral" },
                    { id: "runs_warm" as const, label: "Run warm" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update({ tempPreference: opt.id })}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      form.tempPreference === opt.id
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200"
                        : "border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {weatherError && (
        <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
          {weatherError}
        </p>
      )}
      <div className="flex justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          disabled={resultsLoading}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {step === 0 ? "Cancel" : "Back"}
        </button>
        <button
          type="button"
          onClick={() => void goNext()}
          disabled={resultsLoading}
          className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 dark:focus:ring-offset-zinc-900"
        >
          {resultsLoading ? "Loading…" : isLastStep ? "Get my packing list" : "Next"}
        </button>
      </div>
    </div>
  );
}
