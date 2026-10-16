// Take-off and landing times from FlightAware AeroAPI. The free ADS-B feeds only know
// where a plane is, not its schedule. Needs FLIGHTAWARE_API_KEY; without it the app
// simply shows no times.

import { fetchWithTimeout } from "./http.js";

interface AeroAirport {
  code_iata?: string | null;
  code_icao?: string | null;
  city?: string | null;
  name?: string | null;
}

interface AeroFlight {
  origin?: AeroAirport | null;
  destination?: AeroAirport | null;
  actual_off?: string | null;
  estimated_off?: string | null;
  scheduled_off?: string | null;
  actual_out?: string | null;
  scheduled_out?: string | null;
  actual_on?: string | null;
  estimated_on?: string | null;
  scheduled_on?: string | null;
  estimated_in?: string | null;
  scheduled_in?: string | null;
}

export interface FlightTimes {
  origin: { code: string | null; city: string | null } | null;
  destination: { code: string | null; city: string | null } | null;
  /** ISO time the plane took off (or is expected to). */
  takeOff: string | null;
  tookOff: boolean;
  /** ISO time the plane is expected to land. */
  landing: string | null;
}

export const CALLSIGN = /^[A-Z0-9]{2,8}$/;

export async function lookUpFlight(callsign: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<FlightTimes | null> {
  const res = await fetchWithTimeout(
    `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(callsign)}?max_pages=1`,
    { headers: { "x-apikey": apiKey, Accept: "application/json" } },
    8000,
    fetchImpl,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`FlightAware answered ${res.status}`);
  const body = (await res.json()) as { flights?: AeroFlight[] };
  return pickAirborne(body.flights ?? []);
}

/** The flight for this callsign that is in the air now: took off, not landed yet. */
export function pickAirborne(flights: AeroFlight[]): FlightTimes | null {
  const f = flights.find((x) => x.actual_off && !x.actual_on) ?? flights.find((x) => x.actual_out && !x.actual_on);
  if (!f) return null;
  const airport = (a?: AeroAirport | null) =>
    a ? { code: a.code_iata || a.code_icao || null, city: a.city || a.name || null } : null;
  return {
    origin: airport(f.origin),
    destination: airport(f.destination),
    takeOff: f.actual_off ?? f.estimated_off ?? f.scheduled_off ?? f.actual_out ?? f.scheduled_out ?? null,
    tookOff: Boolean(f.actual_off),
    landing: f.estimated_on ?? f.scheduled_on ?? f.estimated_in ?? f.scheduled_in ?? null,
  };
}
