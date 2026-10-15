import { toSightings, type Sighting } from "./aircraft";
import { fetchAircraft } from "./feed";
import { compassPoint, type LatLon } from "./geo";

import { updateSky } from "./sky";
=======
import { formatRoute, RouteCache } from "./routes";


const RADIUS_NM = 15;
const REFRESH_MS = 10_000;
const MAX_SHOWN = 12;

const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const listEl = document.querySelector<HTMLElement>("#list")!;
const locateBtn = document.querySelector<HTMLButtonElement>("#locate")!;

let viewer: LatLon | null = null;
let timer: number | undefined;
let shown: Sighting[] = [];
const routes = new RouteCache();

function setStatus(text: string) {
  statusEl.textContent = text;
}

function fmt(n: number | null, unit: string, digits = 0): string {
  return n == null ? "–" : `${n.toLocaleString(undefined, { maximumFractionDigits: digits })} ${unit}`;
}

function card(s: Sighting, isTop: boolean): HTMLElement {
  const el = document.createElement("article");
  el.className = isTop ? "plane top" : "plane";
  const title = s.callsign ?? s.registration ?? s.id.toUpperCase();
  const type = s.typeName ?? "Unknown type";
  const route = s.callsign ? routes.get(s.callsign) : null;
  const climb =
    s.verticalRateFpm == null || Math.abs(s.verticalRateFpm) < 300
      ? "level"
      : s.verticalRateFpm > 0
        ? "climbing"
        : "descending";
  el.innerHTML = `
    ${isTop ? '<p class="badge">Most overhead</p>' : ""}
    <h2></h2>
    <p class="what"></p>
    ${route ? '<p class="route"></p>' : ""}
    <p class="type"></p>
    <dl>
      <div><dt>Look</dt><dd>${compassPoint(s.bearingDeg)}, ${Math.round(s.elevationDeg)}° up</dd></div>
      <div><dt>Distance</dt><dd>${fmt(s.distanceNm, "nm", 1)}</dd></div>
      <div><dt>Altitude</dt><dd>${fmt(s.altitudeFt, "ft")} · ${climb}</dd></div>
      <div><dt>Speed</dt><dd>${fmt(s.speedKt, "kt")}${s.trackDeg == null ? "" : ` heading ${compassPoint(s.trackDeg)}`}</dd></div>
    </dl>`;
  // Feed strings go in via textContent so they can't inject markup.
  el.querySelector("h2")!.textContent = title;
  el.querySelector(".what")!.textContent = [s.airline ?? s.operator, type].filter(Boolean).join(" · ");
  if (route) el.querySelector(".route")!.textContent = formatRoute(route);
  el.querySelector(".type")!.textContent = [
    s.airline && s.operator && s.operator !== s.airline ? `Operated by ${s.operator}` : null,
    s.registration && s.registration !== title ? s.registration : null,
    s.typeCode,
  ]
    .filter(Boolean)
    .join(" · ");
  return el;
}

async function refresh() {
  if (!viewer) return;
  try {
    const raw = await fetchAircraft(viewer, RADIUS_NM);
    const sightings = toSightings(raw, viewer).slice(0, MAX_SHOWN);

    listEl.replaceChildren(...sightings.map((s, i) => card(s, i === 0)));
    updateSky(sightings, RADIUS_NM);
=======
    shown = sightings;
    render();
    void loadRoutes(sightings);

    setStatus(
      sightings.length
        ? `${sightings.length} plane${sightings.length === 1 ? "" : "s"} within ${RADIUS_NM} nm · updated ${new Date().toLocaleTimeString()}`
        : `No planes in the air within ${RADIUS_NM} nm right now.`,
    );
  } catch (err) {
    setStatus(`Couldn't reach the flight feed (${(err as Error).message}). Retrying…`);
  }
}

function render() {
  listEl.replaceChildren(...shown.map((s, i) => card(s, i === 0)));
}

/** Look up routes for airline flights in the background and redraw when any arrive. */
async function loadRoutes(sightings: Sighting[]) {
  const queries = sightings
    .filter((s) => s.callsign && s.flightNumber)
    .map((s) => ({ callsign: s.callsign!, ...s.position }));
  try {
    if ((await routes.load(queries)) && sightings === shown) render();
  } catch {
    // Routes are a nice-to-have; the cards are still useful without them.
  }
}

function start() {
  if (!("geolocation" in navigator)) {
    setStatus("This browser can't share your location.");
    return;
  }
  setStatus("Finding you…");
  navigator.geolocation.watchPosition(
    (pos) => {
      const first = viewer == null;
      viewer = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      if (first) {
        locateBtn.hidden = true;
        void refresh();
        timer = window.setInterval(refresh, REFRESH_MS);
      }
    },
    (err) => setStatus(`Location unavailable: ${err.message}`),
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
