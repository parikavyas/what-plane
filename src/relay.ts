// The ADS-B feeds don't send CORS headers, so browsers block direct calls from the
// hosted site. relay/worker.js is a tiny Cloudflare Worker that forwards the few
// requests we make and adds those headers. Set its URL with VITE_FEED_RELAY at build
// time; without it the app still tries the feeds directly (fine for non-browser tests).

export const RELAY = (import.meta.env?.VITE_FEED_RELAY ?? "").trim().replace(/\/+$/, "");

/** URL for `path` on a feed host, going through the relay when one is set. */
export function viaRelay(host: "airplanes.live" | "adsb.lol", path: string, relay = RELAY): string {
  return relay ? `${relay}/${host}${path}` : `https://api.${host}${path}`;
}
