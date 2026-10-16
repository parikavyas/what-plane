// Small helpers shared by the /api functions.

export function json(body: unknown, init: { status?: number; cacheSeconds?: number; headers?: Record<string, string> } = {}): Response {
  const { status = 200, cacheSeconds = 0, headers = {} } = init;
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // s-maxage lets Vercel's CDN answer repeat requests without running the function.
      "Cache-Control": cacheSeconds > 0 ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}` : "no-store",
      ...headers,
    },
  });
}

/** Parses a latitude/longitude pair from query params, snapped to 2 decimals (about 1 km) so nearby requests share a cache entry. */
export function parsePoint(params: URLSearchParams): { lat: number; lon: number } | null {
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!params.has("lat") || !params.has("lon") || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}

/** fetch() with a deadline, so a hung upstream can't hold the function open. */
export async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 8000, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetchImpl(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const USER_AGENT = "what-plane (https://github.com/parikavyas/what-plane)";
