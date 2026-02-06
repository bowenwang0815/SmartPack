/**
 * Fetch weather forecast from Open-Meteo (free, no API key) and derive
 * weather tags for the recommendation engine: hot, cold, rain, snow, windy.
 */

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

/** Weather tags we use in the packing engine. */
export type WeatherTag = "hot" | "cold" | "rain" | "snow" | "windy" | "sun";

interface DailyForecast {
  time: string[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_sum: (number | null)[];
  weathercode: (number | null)[];
  windspeed_10m_max?: (number | null)[];
}

interface OpenMeteoResponse {
  daily?: DailyForecast;
}

/**
 * Open-Meteo WMO weather codes: 0 clear, 1-3 clouds, 45/48 fog,
 * 51-67 rain/drizzle, 71-77 snow, 80-82 rain showers, 85-86 snow showers,
 * 95-99 thunderstorm.
 */
function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
}

function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
}

/**
 * Fetches daily forecast for the given location and date range, then
 * returns weather tags (hot, cold, rain, snow, windy) for the packing engine.
 * Uses trip dates; if the trip is in the past or too far in the future,
 * the API may not return data (forecast is limited to ~16 days).
 */
export async function fetchWeatherTags(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max",
    timezone: "auto",
  });
  const url = `${OPEN_METEO_BASE}?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as OpenMeteoResponse;
  const daily = data.daily;
  if (!daily?.time?.length) return [];

  const tags = new Set<string>();
  const maxTemps = daily.temperature_2m_max ?? [];
  const minTemps = daily.temperature_2m_min ?? [];
  const precip = daily.precipitation_sum ?? [];
  const codes = daily.weathercode ?? [];
  const wind = daily.windspeed_10m_max ?? [];

  const hotThresholdC = 28;
  const coldThresholdC = 10;
  const rainPrecipMm = 0.5;
  const windyKmh = 35;

  for (let i = 0; i < daily.time.length; i++) {
    const maxT = maxTemps[i];
    const minT = minTemps[i];
    const p = precip[i] ?? 0;
    const code = codes[i] ?? 0;
    const w = wind[i] ?? 0;

    if (typeof maxT === "number" && maxT >= hotThresholdC) tags.add("hot");
    if (typeof minT === "number" && minT <= coldThresholdC) tags.add("cold");
    if (p >= rainPrecipMm || isRainCode(code)) tags.add("rain");
    if (isSnowCode(code)) tags.add("snow");
    if (typeof w === "number" && w >= windyKmh) tags.add("windy");
  }

  // If we saw no temp extremes but have data, add mild indicators from averages
  if (tags.size === 0 && maxTemps.length > 0) {
    const avgMax = maxTemps.reduce((a, b) => a + (b ?? 0), 0) / maxTemps.filter(Boolean).length;
    const avgMin = minTemps.reduce((a, b) => a + (b ?? 0), 0) / minTemps.filter(Boolean).length;
    if (avgMax >= hotThresholdC) tags.add("hot");
    if (avgMin <= coldThresholdC) tags.add("cold");
  }

  return Array.from(tags);
}
