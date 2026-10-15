// Cloudflare Worker that lets the What Plane web app reach the ADS-B feeds.
// The feeds don't send CORS headers, so a browser on parikavyas.github.io can't
// read them directly. This forwards only the requests the app makes and adds them.
//
//   GET  /airplanes.live/v2/point/{lat}/{lon}/{nm}  -> https://api.airplanes.live/...
//   GET  /adsb.lol/v2/point/{lat}/{lon}/{nm}        -> https://api.adsb.lol/...
//   POST /adsb.lol/api/0/routeset                   -> https://api.adsb.lol/...

const ALLOWED_ORIGINS = ["https://parikavyas.github.io"];
const HOSTS = { "airplanes.live": "api.airplanes.live", "adsb.lol": "api.adsb.lol" };
const POINT = /^\/v2\/point\/-?\d+(\.\d+)?\/-?\d+(\.\d+)?\/\d+$/;

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") ?? "";
    const allowed =
      ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin);
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const [, site, ...rest] = url.pathname.split("/");
    const path = "/" + rest.join("/");
    const host = HOSTS[site];
    const ok =
      host &&
      ((request.method === "GET" && POINT.test(path)) ||
        (request.method === "POST" && site === "adsb.lol" && path === "/api/0/routeset"));
    if (!ok) return new Response("Not found", { status: 404, headers: cors });

    const upstream = await fetch(`https://${host}${path}`, {
      method: request.method,
      headers: { "Content-Type": "application/json", "User-Agent": "what-plane-relay" },
      body: request.method === "POST" ? await request.text() : undefined,
    });
    const headers = new Headers(cors);
    headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/json");
    headers.set("Cache-Control", "no-store");
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
