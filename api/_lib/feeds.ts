// Fetches live aircraft near a point from the free community ADS-B networks.
// Modelled on God's Eye View's proxy: answers are cached for a few seconds, a feed that
// says "slow down" (429) or breaks is left alone for a while, and if every feed fails we
// serve the last good answer rather than an empty sky.

import { fetchWithTimeout, USER_AGENT } from "./http.js";

export interface Source {
  name: string;
  url(lat: number, lon: number, nm: number): string;
}

// adsb.lol has no daily cap, so it goes first. airplanes.live's free tier allows only
// 500 requests a day, so it is the last resort.
export const SOURCES: Source[] = [
  { name: "adsb.lol", url: (lat, lon, nm) => `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${nm}` },
  { name: "adsb.fi", url: (lat, lon, nm) => `https://opendata.adsb.fi/api/v2/lat/${lat}/lon/${lon}/dist/${nm}` },
  { name: "airplanes.live", url: (lat, lon, nm) => `https://api.airplanes.live/v2/point/${lat}/${lon}/${nm}` },
];

// Only the fields the app shows, which keeps the reply small on a phone connection.
const KEEP = ["hex", "flight", "r", "t", "desc", "ownOp", "alt_baro", "alt_geom", "gs", "track", "baro_rate", "lat", "lon"] as const;

export interface FeedAnswer {
  ac: Record<string, unknown>[];
  source: string;
  stale: boolean;
  ageMs: number;
}

const FRESH_MS = 8_000;
const STALE_MAX_MS = 5 * 60_000;
const RATE_LIMIT_COOLDOWN_MS = 30_000;
const ERROR_COOLDOWN_MS = 15_000;

export class FeedRelay {
  private cache = new Map<string, { ac: Record<string, unknown>[]; source: string; at: number }>();
  private cooldownUntil = new Map<string, number>();

  constructor(
    private sources: Source[] = SOURCES,
    private fetchImpl: typeof fetch = fetch,
    private now: () => number = Date.now,
  ) {}

  async get(lat: number, lon: number, nm: number): Promise<FeedAnswer> {
    const key = `${lat},${lon},${nm}`;
    const hit = this.cache.get(key);
    const now = this.now();
    if (hit && now - hit.at < FRESH_MS) return { ac: hit.ac, source: hit.source, stale: false, ageMs: now - hit.at };

    for (const src of this.sources) {
      if ((this.cooldownUntil.get(src.name) ?? 0) > now) continue;
      try {
        const res = await fetchWithTimeout(src.url(lat, lon, nm), { headers: { "User-Agent": USER_AGENT } }, 8000, this.fetchImpl);
        if (!res.ok) {
          this.coolDown(src.name, res);
          continue;
        }
        const body = (await res.json()) as { ac?: unknown; aircraft?: unknown };
        const list = Array.isArray(body.ac) ? body.ac : Array.isArray(body.aircraft) ? body.aircraft : null;
        if (!list) {
          this.coolDown(src.name);
          continue;
        }
        const ac = list.map(trim);
        this.cache.set(key, { ac, source: src.name, at: now });
        this.prune(now);
        return { ac, source: src.name, stale: false, ageMs: 0 };
      } catch {
        this.coolDown(src.name);
      }
    }
    if (hit && now - hit.at < STALE_MAX_MS) return { ac: hit.ac, source: hit.source, stale: true, ageMs: now - hit.at };
    throw new Error("Every flight feed is down or busy right now");
  }

  private coolDown(name: string, res?: Response) {
    let ms = res?.status === 429 ? RATE_LIMIT_COOLDOWN_MS : ERROR_COOLDOWN_MS;
    const retry = Number(res?.headers.get("retry-after"));
    if (Number.isFinite(retry) && retry > 0) ms = Math.min(120_000, Math.max(5_000, retry * 1000));
    this.cooldownUntil.set(name, this.now() + ms);
  }

  private prune(now: number) {
    if (this.cache.size < 200) return;
    for (const [k, v] of this.cache) if (now - v.at > STALE_MAX_MS) this.cache.delete(k);
  }
}

function trim(raw: unknown): Record<string, unknown> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of KEEP) if (src[k] !== undefined) out[k] = src[k];
  return out;
}
