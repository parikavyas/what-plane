// GET /api/place?lat=..&lon=.. → { name } such as "Hounslow, London", from OpenStreetMap's Nominatim.

import { fetchWithTimeout, json, parsePoint, USER_AGENT } from "./_lib/http.js";

interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  village?: string;
  town?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
}

export function placeName(a: NominatimAddress): string | null {
  // Most specific name first, then the next wider one that's different from it.
  const names = [a.suburb ?? a.neighbourhood, a.village, a.town, a.city, a.county, a.state, a.country].filter(
    (p, i, all): p is string => Boolean(p) && all.indexOf(p) === i,
  );
  return names.length ? names.slice(0, 2).join(", ") : null;
}

export async function GET(request: Request): Promise<Response> {
  const point = parsePoint(new URL(request.url).searchParams);
  if (!point) return json({ error: "Pass lat and lon" }, { status: 400 });
  try {
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${point.lat}&lon=${point.lon}`,
      { headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" } },
    );
    if (!res.ok) return json({ name: null }, { status: 502 });
    const body = (await res.json()) as { address?: NominatimAddress };
    // Places don't move: let the CDN keep each answer for a day, per Nominatim's usage policy.
    return json({ name: placeName(body.address ?? {}) }, { cacheSeconds: 86_400 });
  } catch {
    return json({ name: null }, { status: 502 });
  }
}
