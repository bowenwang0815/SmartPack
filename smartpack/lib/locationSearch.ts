/**
 * Location search via Open-Meteo Geocoding API (free, no API key).
 * Returns places like "Irvine, California, USA".
 */

export interface LocationResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  country: string;
  admin1?: string;
}

export function formatLocationLabel(loc: LocationResult): string {
  if (loc.admin1) {
    return `${loc.name}, ${loc.admin1}, ${loc.country}`;
  }
  return `${loc.name}, ${loc.country}`;
}

export async function searchLocations(query: string): Promise<LocationResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    name: trimmed,
    count: "10",
    language: "en",
  });
  const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as { results?: RawLocation[] };
  const results = data.results ?? [];
  return results.map((r) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    countryCode: r.country_code ?? "",
    country: r.country ?? "",
    admin1: r.admin1,
  }));
}

interface RawLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
}
