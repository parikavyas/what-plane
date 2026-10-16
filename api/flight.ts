// GET /api/flight?callsign=BAW117 → take-off and landing times, when a FlightAware key is set.

import { CALLSIGN, lookUpFlight } from "./_lib/flight.js";
import { json } from "./_lib/http.js";

export async function GET(request: Request): Promise<Response> {
  const callsign = (new URL(request.url).searchParams.get("callsign") ?? "").trim().toUpperCase();
  if (!CALLSIGN.test(callsign)) return json({ error: "Pass a callsign like BAW117" }, { status: 400 });
  const key = process.env.FLIGHTAWARE_API_KEY;
  if (!key) return json({ available: false }, { cacheSeconds: 3600 });
  try {
    const times = await lookUpFlight(callsign, key);
    // A flight's times barely move once it's airborne; caching for 15 minutes keeps us
    // well inside FlightAware's free monthly allowance.
    return json({ available: true, flight: times }, { cacheSeconds: 900 });
  } catch (err) {
    return json({ available: true, error: (err as Error).message }, { status: 502 });
  }
}
