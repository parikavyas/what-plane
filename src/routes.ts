// Flight routes (origin and destination airports) from adsb.lol's free route
// database, which is keyed by callsign. Routes are crowd-sourced, so we only show
// ones adsb.lol marks as plausible for where the plane actually is.

import type { LatLon } from "./geo";
import { viaRelay } from "./relay";

export const ROUTESET_URL = viaRelay("adsb.lol", "/api/0/routeset");

export interface Airport {
  iata: string | null;
  icao: string | null;
  city: string | null;
}

export interface Route {
  origin: Airport;
  destination: Airport;
}

/** Shape of one entry in the routeset reply. Every field can be missing. */
interface RawRoute {
  callsign?: string;
  plausible?: boolean | number;
  _airports?: { iata?: string; icao?: string; location?: string; name?: string }[];
}

export interface RouteQuery extends LatLon {
  callsign: string;
}

/** Look up routes for a batch of callsigns. Callsigns with no known or plausible route map to null. */
export async function fetchRoutes(
  planes: RouteQuery[],
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, Route | null>> {
  const out = new Map<string, Route | null>(planes.map((p) => [p.callsign, null]));
  if (!planes.length) return out;
  const res = await fetchImpl(ROUTESET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planes: planes.map((p) => ({ callsign: p.callsign, lat: p.lat, lng: p.lon })) }),
  });
  if (!res.ok) throw new Error(`Route lookup answered ${res.status}`);
  const body = (await res.json()) as RawRoute[];
  for (const raw of Array.isArray(body) ? body : []) {
    if (!raw.callsign || !out.has(raw.callsign) || !raw.plausible) continue;
    const airports = raw._airports ?? [];
    if (airports.length < 2) continue;
    const toAirport = (a: (typeof airports)[number]): Airport => ({
      iata: a.iata || null,
      icao: a.icao || null,
      city: a.location || a.name || null,
    });
    // Multi-leg routes list every stop; origin and final destination are what matter overhead.
    out.set(raw.callsign, { origin: toAirport(airports[0]), destination: toAirport(airports[airports.length - 1]) });
  }
  return out;
}

/** "New York (JFK) → Los Angeles (LAX)" */
export function formatRoute(route: Route): string {
  const one = (a: Airport) => {
    const code = a.iata ?? a.icao;
    if (a.city && code) return `${a.city} (${code})`;
    return a.city ?? code ?? "?";
  };
  return `${one(route.origin)} → ${one(route.destination)}`;
}

const ROUTE_TTL_MS = 30 * 60_000;
const RETRY_MS = 2 * 60_000;

/** Remembers routes per callsign so each flight is looked up once, not every refresh. */
export class RouteCache {
  private entries = new Map<string, { route: Route | null; at: number }>();

  constructor(
    private fetchImpl: typeof fetch = fetch,
    private now: () => number = Date.now,
  ) {}

  get(callsign: string): Route | null {
    return this.entries.get(callsign)?.route ?? null;
  }

  /** Fetch routes for callsigns not already cached. Resolves true when something new arrived. */
  async load(planes: RouteQuery[]): Promise<boolean> {
    const now = this.now();
    const missing = planes.filter((p) => {
      const hit = this.entries.get(p.callsign);
      return !hit || now - hit.at > ROUTE_TTL_MS;
    });
    if (!missing.length) return false;
    let found: Map<string, Route | null>;
    try {
      found = await fetchRoutes(missing, this.fetchImpl);
    } catch (err) {
      // Don't hammer a failing service every refresh: try these again in a couple of minutes.
      for (const p of missing) this.entries.set(p.callsign, { route: null, at: now - ROUTE_TTL_MS + RETRY_MS });
      throw err;
    }
    let changed = false;
    for (const [callsign, route] of found) {
      if (route) changed = true;
      this.entries.set(callsign, { route, at: now });
    }
    return changed;
  }
}
