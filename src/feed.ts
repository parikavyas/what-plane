// Flight data from community ADS-B aggregators. Both speak the readsb "v2" JSON
// format, need no API key and send CORS headers, so the browser can call them directly.
// airplanes.live asks for at most one request per second; we poll far slower than that.

import type { LatLon } from "./geo";

export const FEEDS = [
  "https://api.airplanes.live/v2/point",
  "https://api.adsb.lol/v2/point",
] as const;

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
  squawk?: string;
  category?: string;
}

export interface FeedResponse {
  ac?: RawAircraft[];
  now?: number;
}

export async function fetchAircraft(
  at: LatLon,
  radiusNm: number,
  fetchImpl: typeof fetch = fetch,
): Promise<RawAircraft[]> {
  const radius = Math.min(250, Math.max(1, Math.round(radiusNm)));
  let lastError: unknown;
  for (const base of FEEDS) {
    try {
      const res = await fetchImpl(`${base}/${at.lat.toFixed(4)}/${at.lon.toFixed(4)}/${radius}`);
      if (!res.ok) throw new Error(`${base} answered ${res.status}`);
      const body = (await res.json()) as FeedResponse;
      return body.ac ?? [];
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No flight feed reachable");
}
