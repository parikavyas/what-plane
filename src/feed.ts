// Flight data from community ADS-B aggregators. Both speak the readsb "v2" JSON
// format and need no API key, but neither sends CORS headers, so the hosted site
// reaches them through the feed relay (see relay.ts).
// airplanes.live asks for at most one request per second; we poll far slower than that.

import type { LatLon } from "./geo";
import { RELAY, viaRelay } from "./relay";

export const FEEDS = [viaRelay("airplanes.live", "/v2/point"), viaRelay("adsb.lol", "/v2/point")];

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
  // fetch() rejects with a TypeError ("Failed to fetch", "Load failed") when the
  // browser blocks the response, which is what a missing relay looks like.
  if (lastError instanceof TypeError) {
    throw new Error(
      RELAY ? "no connection to the feed relay, check your internet" : "the feeds block this site and no feed relay is set up",
    );
  }
  throw lastError instanceof Error ? lastError : new Error("No flight feed reachable");
}
