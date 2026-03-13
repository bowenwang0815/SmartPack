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
import { fetchWeatherForecast, fetchWeatherTags, type WeatherForecast } from "@/lib/weather";

const ACTIVITIES = [
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "hiking", label: "Hiking", emoji: "🏔️" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "nightlife", label: "Nightlife", emoji: "🌃" },
  { id: "snow", label: "Snow / winter", emoji: "❄️" },
  { id: "casual", label: "Casual / city", emoji: "🏙️" },
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
  { id: "style", title: "Weather & packing style", subtitle: "Last step" },
] as const;

const DEBOUNCE_MS = 300;

type TempUnit = "C" | "F";

function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function formatTempRange(minC: number, maxC: number, unit: TempUnit): string {
  const min = unit === "F" ? celsiusToFahrenheit(minC) : minC;
  const max = unit === "F" ? celsiusToFahrenheit(maxC) : maxC;
  return `${min}–${max}°${unit}`;
}

export default function TripFinder() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TripForm>(defaultForm);
  const [results, setResults] = useState<RankedItem[] | null>(null);
  const [tempUnit, setTempUnit] = useState<TempUnit>("C");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  /** Forecast fetched on step 4 for display (temp + tags); reused on submit unless overridden. */
  const [fetchedForecast, setFetchedForecast] = useState<WeatherForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
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

  // Fetch forecast when user reaches step 4 (Weather) with location + dates, for display
  useEffect(() => {
    if (
      step !== 4 ||
      form.latitude == null ||
      form.longitude == null ||
      !form.startDate ||
      !form.endDate
    ) {
      if (step !== 4) {
        const t = setTimeout(() => setFetchedForecast(null), 0);
        return () => clearTimeout(t);
      }
      return;
    }
    let cancelled = false;
    const run = async () => {
      setForecastError(null);
      setForecastLoading(true);
      try {
        const forecast = await fetchWeatherForecast(
          form.latitude!,
          form.longitude!,
          form.startDate,
          form.endDate
        );
        if (!cancelled) {
          setFetchedForecast(forecast);
          if (!forecast) {
            setForecastError(
              "No forecast available for these dates (forecast is limited to ~16 days)."
              
            );
          }
        }
      } catch {
        if (!cancelled) {
          setForecastError("Weather unavailable.");
          setFetchedForecast(null);
        }
      } finally {
        if (!cancelled) setForecastLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [step, form.latitude, form.longitude, form.startDate, form.endDate]);

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
      const hasOverride = form.weatherTags.length > 0;
      let weatherTags: string[] = form.weatherTags;
      if (!hasOverride && form.latitude != null && form.longitude != null && form.startDate && form.endDate) {
        if (fetchedForecast?.tags?.length) {
          weatherTags = fetchedForecast.tags;
        } else {
          try {
            const fetched = await fetchWeatherTags(
              form.latitude,
              form.longitude,
              form.startDate,
              form.endDate
            );
            if (fetched.length > 0) weatherTags = fetched;
          } catch {
            setWeatherError("Weather unavailable; using your choices.");
          }
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
    setFetchedForecast(null);
    setForecastError(null);
  };

  if (isComplete && results) {
    // Contextual suggestions for this trip (shown first): suggested tier + high-score non-catalog-essentials
    const suggestedForTrip = results
      .filter((r) => r.tier === "suggested" || (r.tier === "essential" && !r.item.isEssential))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    // Universal essentials (ID, passport, phone, etc.) — own section, not at the very top
    const essentialsAlways = results.filter((r) => r.item.isEssential);
    const optional = results.filter((r) => r.tier === "optional").slice(0, 6);
    const days = getTripLengthDays(form.startDate, form.endDate);

    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Your list
          </h2>
          <div className="flex items-center gap-2">
            {fetchedForecast && (
              <div className="flex rounded border border-slate-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setTempUnit("C")}
                  className={`rounded-l px-2 py-0.5 text-xs font-medium ${tempUnit === "C" ? "bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-50" : "bg-transparent text-slate-500 dark:text-slate-400"}`}
                >
                  °C
                </button>
                <button
                  type="button"
                  onClick={() => setTempUnit("F")}
                  className={`rounded-r px-2 py-0.5 text-xs font-medium ${tempUnit === "F" ? "bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-50" : "bg-transparent text-slate-500 dark:text-slate-400"}`}
                >
                  °F
                </button>
              </div>
            )}
          </div>
        </div>
        {form.destination && (
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            {form.destination}
            {days > 0 && ` · ${days} day${days !== 1 ? "s" : ""}`}
            {fetchedForecast && ` · ${formatTempRange(fetchedForecast.tempMin, fetchedForecast.tempMax, tempUnit)}`}
          </p>
        )}

        <section className="mb-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            For this trip
          </h3>
          {suggestedForTrip.length > 0 ? (
            <ul className="space-y-2">
              {suggestedForTrip.map((r) => (
                <li
                  key={r.item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/50"
                >
                  <div>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {r.item.name}
                    </span>
                    <span className="ml-2 text-slate-500">×{r.suggestedQuantity}</span>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {r.reason}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-sky-200 bg-sky-50/80 py-3 px-4 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
              Nothing extra for this trip — see essentials and optional below.
            </p>
          )}
        </section>

        <section className="mb-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Essentials
          </h3>
          <ul className="space-y-1.5">
            {essentialsAlways.map((r) => (
              <li
                key={r.item.id}
                className="flex items-center justify-between rounded-lg bg-sky-50/80 py-2 px-3 dark:bg-slate-800/50"
              >
                <span className="text-slate-800 dark:text-slate-200">
                  {r.item.name}
                </span>
                <span className="text-sm text-slate-500">×{r.suggestedQuantity}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Optional
          </h3>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            {optional.map((r) => (
              <li key={r.item.id}>
                {r.item.name} ×{r.suggestedQuantity} — {r.reason}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={startOver}
            className="rounded-xl bg-teal-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:bg-teal-500 dark:hover:bg-teal-600 dark:focus:ring-offset-slate-800"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const canProceedStep0 =
    form.destination.trim() !== "" && form.startDate !== "" && form.endDate !== "";
  const canProceedStep1 = form.activities.length > 0;
  const canProceed =
    step === 0 ? canProceedStep0 : step === 1 ? canProceedStep1 : true;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            Step {step + 1} of {totalSteps}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-teal-500 dark:bg-teal-400 transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-8 min-h-[260px]">
        {step === 0 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
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
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
              {locationLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  Searching…
                </span>
              )}
              {showLocationDropdown && locationSuggestions.length > 0 && (
                <ul
                  className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
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
                      className="cursor-pointer px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {formatLocationLabel(loc)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              When?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Start
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;

                    update({
                      startDate: newStart,
                      endDate:
                        form.endDate && form.endDate < newStart ? "" : form.endDate,
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  End
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => update({ endDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 via-teal-50/80 to-amber-50/60 p-6 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/95">
            {/* Decorative background emojis */}
            <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
              <span className="absolute right-4 top-6 text-6xl opacity-[0.12] dark:opacity-[0.08]">🏔️</span>
              <span className="absolute bottom-8 left-6 text-5xl opacity-[0.12] dark:opacity-[0.08]">🏖️</span>
              <span className="absolute right-16 bottom-12 text-4xl opacity-[0.1] dark:opacity-[0.06]">🏙️</span>
            </div>
            <div className="relative">
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                What will you do on your trip?
              </h3>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Select all that apply.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ACTIVITIES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleActivity(a.id)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      form.activities.includes(a.id)
                        ? "border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-900/40 dark:text-teal-200"
                        : "border-slate-200 bg-white/90 text-slate-700 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-500"
                    }`}
                  >
                    <span className="text-xl" role="img" aria-hidden>{a.emoji}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              How are you traveling?
            </h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Lighter or heavier packing.
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
                      ? "border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-teal-900/40"
                      : "border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800"
                  }`}
                >
                  <span className="block font-medium text-slate-900 dark:text-slate-50">
                    {opt.label}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              Will you have laundry access?
            </h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              You can pack fewer clothes.
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
                      ? "border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-900/40 dark:text-teal-200"
                      : "border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Weather
                </h3>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-600">
                  <button
                    type="button"
                    onClick={() => setTempUnit("C")}
                    className={`rounded-l-md px-2.5 py-1 text-sm font-medium ${tempUnit === "C" ? "bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-50" : "bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"}`}
                  >
                    °C
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempUnit("F")}
                    className={`rounded-r-md px-2.5 py-1 text-sm font-medium ${tempUnit === "F" ? "bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-50" : "bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"}`}
                  >
                    °F
                  </button>
                </div>
              </div>
              {form.latitude != null && form.longitude != null && form.startDate && form.endDate ? (
                <>
                  {forecastLoading && (
                    <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                      Loading weather…
                    </p>
                  )}
                  {forecastError && (
                    <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
                      {forecastError}
                    </p>
                  )}
                  {fetchedForecast && !forecastLoading && (
                    <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/80 p-4 dark:border-slate-600 dark:bg-slate-800/50">
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        {formatTempRange(fetchedForecast.tempMin, fetchedForecast.tempMax, tempUnit)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Highs and lows for your dates
                      </p>
                      {fetchedForecast.conditionsSummary && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {fetchedForecast.conditionsSummary}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                        Change below if needed.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                  What weather do you expect?
                </p>
              )}
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {form.latitude != null && form.longitude != null && form.startDate && form.endDate
                  ? "Change weather"
                  : "Expected weather"}
              </p>
              <div className="flex flex-wrap gap-2">
                {WEATHER_OPTIONS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWeather(w.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      form.weatherTags.includes(w.id)
                        ? "bg-teal-600 text-white dark:bg-teal-500"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-50">
                Packing style
              </h3>
              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
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
                className="w-full accent-teal-600"
              />
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-50">
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
                        ? "border-teal-500 bg-teal-50 text-teal-800 dark:border-teal-400 dark:bg-teal-900/40 dark:text-teal-200"
                        : "border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800"
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
        {step === 0 ? (
          <div />
        ) : (
          <button
            type="button"
            onClick={goBack}
            disabled={resultsLoading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={() => void goNext()}
          disabled={resultsLoading || (!isLastStep && !canProceed)}
          className="rounded-lg bg-teal-600 px-6 py-2.5 font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none dark:bg-teal-500 dark:hover:bg-teal-600 dark:focus:ring-offset-slate-800"
        >
          {resultsLoading ? "Loading…" : isLastStep ? "See my list" : "Next"}
        </button>
      </div>
    </div>
  );
}
