// GET /api/aircraft?lat=..&lon=..&nm=.. → { ac, source, stale } from the community ADS-B feeds.

import { FeedRelay } from "./_lib/feeds.js";
import { json, parsePoint } from "./_lib/http.js";

// Lives as long as the function instance stays warm, so back-to-back requests share it.
const relay = new FeedRelay();

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const point = parsePoint(params);
  const nm = Math.round(Number(params.get("nm") ?? 11));
  if (!point || !Number.isFinite(nm) || nm < 1 || nm > 50) {
    return json({ error: "Pass lat, lon and nm (1 to 50)" }, { status: 400 });
  }
  try {
    const answer = await relay.get(point.lat, point.lon, nm);
    return json({ ac: answer.ac, source: answer.source, stale: answer.stale }, { cacheSeconds: answer.stale ? 0 : 5 });
  } catch (err) {
    return json({ error: (err as Error).message }, { status: 503 });
  }
}
