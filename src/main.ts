import { toSightings, type Sighting } from "./aircraft";
import { compassSupported, startCompass } from "./compass";
import { fetchAircraft } from "./feed";
import { clockTime, FlightTimesCache, type Airport as TimesAirport } from "./flights";
import { compassPoint, M_PER_NM, type LatLon } from "./geo";
import { SkyMap } from "./map";
import { RouteCache, type Airport as RouteAirport } from "./routes";

const RADIUS_KM = 20;
const QUERY_NM = Math.ceil((RADIUS_KM * 1000) / M_PER_NM);
const REFRESH_MS = 10_000;
const MAX_SHOWN = 12;

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const placeEl = $("#place");
const coordsEl = $("#coords");
const facingBtn = $<HTMLButtonElement>("#facing");
const clockEl = $("#clock");
const dateEl = $("#date");
const locateBtn = $<HTMLButtonElement>("#locate");
const mapPanel = $("#map-panel");
const statusEl = $("#status");
const nearbyEl = $<HTMLDetailsElement>("#nearby");
const countEl = $("#count");
const listEl = $("#list");

let viewer: LatLon | null = null;
let timer: number | undefined;
let shown: Sighting[] = [];
let skyMap: SkyMap | null = null;
let heading: number | null = null;
let placeFor = "";
const routes = new RouteCache();
const times = new FlightTimesCache();

function tickClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  dateEl.textContent = now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
tickClock();
setInterval(tickClock, 15_000);

function showViewer(at: LatLon) {
  const ns = at.lat >= 0 ? "N" : "S";
  const ew = at.lon >= 0 ? "E" : "W";
  coordsEl.textContent = `${Math.abs(at.lat).toFixed(4)}° ${ns}, ${Math.abs(at.lon).toFixed(4)}° ${ew}`;
  void loadPlace(at);
}

async function loadPlace(at: LatLon) {
  const key = `${at.lat.toFixed(2)},${at.lon.toFixed(2)}`;
  if (key === placeFor) return;
  placeFor = key;
  try {
    const res = await fetch(`/api/place?lat=${at.lat.toFixed(2)}&lon=${at.lon.toFixed(2)}`);
    const body = (await res.json()) as { name?: string | null };
    if (body.name) placeEl.textContent = body.name;
  } catch {
    // The coordinates are still shown; the place name is a nicety.
  }
}

function showHeading() {
  facingBtn.hidden = false;
  if (heading == null) return;
  facingBtn.textContent = `Facing ${Math.round(heading)}° ${compassPoint(heading)}`;
  facingBtn.disabled = true;
}

facingBtn.addEventListener("click", async () => {
  const ok = await startCompass((deg) => {
    heading = deg;
    showHeading();
    skyMap?.setHeading(deg);
  });
  if (!ok) {
    facingBtn.textContent = "Compass not allowed";
    facingBtn.disabled = true;
    return;
  }
  setTimeout(() => {
    if (heading == null) {
      facingBtn.textContent = "No compass on this phone";
      facingBtn.disabled = true;
    }
  }, 3000);
});

const fmt = (n: number, digits = 0) => n.toLocaleString(undefined, { maximumFractionDigits: digits });

function airportBlock(a: { code: string | null; city: string | null } | null, time: string | null, verb: string, cls: string) {
  const el = document.createElement("div");
  el.className = cls;
  const code = document.createElement("div");
  code.className = "code";
  code.textContent = a?.code ?? "?";
  const city = document.createElement("div");
  city.className = "city";
  city.textContent = a?.city ?? "";
  el.append(code, city);
  if (time) {
    const t = document.createElement("div");
    t.className = "tm";
    t.textContent = `${verb} ${time}`;
    el.append(t);
  }
  return el;
}

const routeAirport = (a: RouteAirport): TimesAirport => ({ code: a.iata ?? a.icao, city: a.city });

function row(s: Sighting, i: number): HTMLLIElement {
  const li = document.createElement("li");
  li.dataset.id = s.id;
  if (i === 0) li.classList.add("top");

  const n = document.createElement("div");
  n.className = "n";
  n.textContent = String(i + 1);

  const top = document.createElement("div");
  top.className = "head";
  const fn = document.createElement("span");
  fn.className = "fn";
  fn.textContent = s.callsign ?? s.registration ?? s.id.toUpperCase();
  const co = document.createElement("span");
  co.className = "co";
  co.textContent = [s.airline ?? s.operator, s.typeName].filter(Boolean).join(" · ") || "Unknown aircraft";
  top.append(fn, co);
  li.append(n, top);

  const ft = s.callsign ? times.get(s.callsign) : null;
  const rt = s.callsign ? routes.get(s.callsign) : null;
  const origin = ft?.origin ?? (rt ? routeAirport(rt.origin) : null);
  const destination = ft?.destination ?? (rt ? routeAirport(rt.destination) : null);
  if (origin || destination) {
    const route = document.createElement("div");
    route.className = "route";
    const arrow = document.createElement("div");
    arrow.className = "arrow";
    arrow.textContent = "✈";
    arrow.setAttribute("aria-label", "to");
    route.append(
      airportBlock(origin, clockTime(ft?.takeOff ?? null), ft?.tookOff === false ? "Leaves" : "Took off", "from"),
      arrow,
      airportBlock(destination, clockTime(ft?.landing ?? null), "Lands", "to"),
    );
    li.append(route);
  }

  const climb =
    s.verticalRateFpm == null || Math.abs(s.verticalRateFpm) < 300 ? "" : s.verticalRateFpm > 0 ? " · climbing" : " · descending";
  const look = document.createElement("div");
  look.className = "look";
  const where = document.createElement("b");
  where.textContent = `${compassPoint(s.bearingDeg)}, ${Math.round(s.elevationDeg)}° up`;
  look.append(
    "Look ",
    where,
    ` · ${fmt(s.distanceNm * M_PER_NM / 1000, 1)} km away · ${fmt(s.altitudeFt)} ft${climb}`,
  );
  li.append(look);
  return li;
}

function render() {
  listEl.replaceChildren(...shown.map(row));
  countEl.textContent = `[${shown.length} spotted]`;
  skyMap?.update(shown, shown[0]?.id ?? null);
}

function pick(id: string) {
  nearbyEl.open = true;
  const li = listEl.querySelector<HTMLLIElement>(`li[data-id="${CSS.escape(id)}"]`);
  if (!li) return;
  li.scrollIntoView({ behavior: "smooth", block: "nearest" });
  li.classList.add("picked");
  setTimeout(() => li.classList.remove("picked"), 1500);
}

async function refresh() {
  if (!viewer) return;
  try {
    const feed = await fetchAircraft(viewer, QUERY_NM);
    shown = toSightings(feed.ac, viewer)
      .filter((s) => s.distanceNm * M_PER_NM <= RADIUS_KM * 1000)
      .slice(0, MAX_SHOWN);
    render();
    void loadExtras(shown);
    const updated = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    statusEl.textContent = shown.length
      ? `${shown.length} plane${shown.length === 1 ? "" : "s"} within ${RADIUS_KM} km · updated ${updated}${feed.stale ? " (feeds busy, showing the last answer)" : ""}`
      : `No planes in the air within ${RADIUS_KM} km right now.`;
  } catch (err) {
    statusEl.textContent = `Couldn't reach the flight feed (${(err as Error).message}). Retrying…`;
  }
}

/** Routes and times arrive in the background; redraw the list when they do. */
async function loadExtras(sightings: Sighting[]) {
  const callsigns = sightings.filter((s) => s.callsign && s.flightNumber).map((s) => s.callsign!);
  const routeQueries = sightings
    .filter((s) => s.callsign && s.flightNumber)
    .map((s) => ({ callsign: s.callsign!, ...s.position }));
  const [gotRoutes, gotTimes] = await Promise.all([
    routes.load(routeQueries).catch(() => false),
    // Times cost FlightAware credit, so only look them up while the list is open.
    nearbyEl.open ? times.load(callsigns) : Promise.resolve(false),
  ]);
  if ((gotRoutes || gotTimes) && sightings === shown) render();
}

nearbyEl.addEventListener("toggle", () => {
  if (nearbyEl.open) void loadExtras(shown);
});

function start() {
  if (!("geolocation" in navigator)) {
    coordsEl.textContent = "This browser can't share your location.";
    return;
  }
  coordsEl.textContent = "Finding you…";
  navigator.geolocation.watchPosition(
    (pos) => {
      const first = viewer == null;
      viewer = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      showViewer(viewer);
      if (first) {
        locateBtn.hidden = true;
        mapPanel.hidden = false;
        nearbyEl.hidden = false;
        skyMap = new SkyMap($("#map"), RADIUS_KM * 1000, pick);
        if (compassSupported()) showHeading();
      }
      skyMap!.setViewer(viewer);
      if (first) {
        void refresh();
        timer = window.setInterval(refresh, REFRESH_MS);
      }
    },
    (err) => (coordsEl.textContent = `Location unavailable: ${err.message}`),
    { enableHighAccuracy: false, maximumAge: 60_000 },
  );
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    window.clearInterval(timer);
    timer = undefined;
  } else if (viewer && timer === undefined) {
    void refresh();
    timer = window.setInterval(refresh, REFRESH_MS);
  }
});

locateBtn.addEventListener("click", start);
