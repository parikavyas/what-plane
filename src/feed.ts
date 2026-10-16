// Live aircraft come from our own /api/aircraft function, which asks the community
// ADS-B networks (adsb.lol, adsb.fi, airplanes.live). The browser can't call those
// directly: they don't send CORS headers.

import type { LatLon } from "./geo";

/** Subset of the readsb aircraft record we use. Every field can be missing. */
export interface RawAircraft {
  hex: string;
  flight?: string;
  r?: string; // registration
  t?: string; // ICAO type designator, e.g. B738
  desc?: string; // long type name, e.g. BOEING 737-800
  ownOp?: string; // owner / operator
  alt_baro?: number | "ground";
  alt_geom?: number;
  gs?: number; // ground speed, knots
  track?: number; // degrees
  baro_rate?: number; // ft/min
  lat?: number;
  lon?: number;
}

export interface FeedResponse {
  ac?: RawAircraft[];
  source?: string;
  stale?: boolean;
  error?: string;
}

/** Same rounding the server uses, so phones near each other hit the same CDN cache entry. */
const snap = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export function aircraftUrl(at: LatLon, radiusNm: number): string {
  return `/api/aircraft?lat=${snap(at.lat)}&lon=${snap(at.lon)}&nm=${Math.round(radiusNm)}`;
}

export async function fetchAircraft(
  at: LatLon,
  radiusNm: number,
  fetchImpl: typeof fetch = fetch,
): Promise<FeedResponse & { ac: RawAircraft[] }> {
  let res: Response;
  try {
    res = await fetchImpl(aircraftUrl(at, radiusNm));
  } catch {
    throw new Error("no internet connection");
  }
  let body: FeedResponse = {};
  try {
    body = (await res.json()) as FeedResponse;
  } catch {
    // A non-JSON reply means the /api functions aren't running (for example a plain static host).
  }
  if (!res.ok || !Array.isArray(body.ac)) {
    throw new Error(body.error ?? `the plane server answered ${res.status}`);
  }
  return { ...body, ac: body.ac };
}
