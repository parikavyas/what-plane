// POST /api/routes → adsb.lol's route lookup (origin and destination by callsign).

import { fetchWithTimeout, json, USER_AGENT } from "./_lib/http.js";

const MAX_PLANES = 25;

export async function POST(request: Request): Promise<Response> {
  let planes: unknown;
  try {
    planes = ((await request.json()) as { planes?: unknown }).planes;
  } catch {
    return json({ error: "Send JSON like { planes: [{ callsign, lat, lng }] }" }, { status: 400 });
  }
  if (!Array.isArray(planes) || planes.length === 0 || planes.length > MAX_PLANES) {
    return json({ error: `Send 1 to ${MAX_PLANES} planes` }, { status: 400 });
  }
  const clean = planes
    .map((p) => p as { callsign?: unknown; lat?: unknown; lng?: unknown })
    .filter((p) => typeof p.callsign === "string" && typeof p.lat === "number" && typeof p.lng === "number")
    .map((p) => ({ callsign: (p.callsign as string).slice(0, 10), lat: p.lat, lng: p.lng }));
  try {
    const res = await fetchWithTimeout("https://api.adsb.lol/api/0/routeset", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ planes: clean }),
    });
    if (!res.ok) return json({ error: `Route lookup answered ${res.status}` }, { status: 502 });
    return json(await res.json());
  } catch {
    return json({ error: "Route lookup is unreachable" }, { status: 502 });
  }
}
