// Wires the radar into the page: redraws on new sightings and, if the user turns it on,
// rotates with the phone's compass so the top of the radar is the way they're facing.

import type { Sighting } from "./aircraft";
import { headingFromOrientation, renderRadar, type OrientationReading } from "./radar";

const host = document.querySelector<HTMLElement>("#sky")!;
const radarEl = document.querySelector<HTMLElement>("#radar")!;
const compassBtn = document.querySelector<HTMLButtonElement>("#compass")!;

let rangeNm = 15;
let sightings: Sighting[] = [];
let heading: number | null = null;
let following = false;
let frame = 0;

function draw() {
  frame = 0;
  renderRadar(radarEl, sightings, rangeNm, following && heading != null ? heading : 0);
}

function scheduleDraw() {
  if (!frame) frame = requestAnimationFrame(draw);
}

export function updateSky(next: Sighting[], range: number) {
  sightings = next;
  rangeNm = range;
  host.hidden = false;
  scheduleDraw();
}

function onOrientation(e: Event) {
  const angle = screen.orientation?.angle ?? 0;
  const h = headingFromOrientation(e as unknown as OrientationReading, angle);
  if (h == null) return;
  // Skip tiny jitters so we're not redrawing constantly.
  if (heading != null && Math.abs(((h - heading + 540) % 360) - 180) < 2) return;
  heading = h;
  if (following) scheduleDraw();
}

type PermissionRequester = { requestPermission?: () => Promise<"granted" | "denied"> };

async function startCompass() {
  // iOS only hands out orientation after the user taps something and agrees.
  const req = (window.DeviceOrientationEvent as unknown as PermissionRequester).requestPermission;
  if (req && (await req().catch(() => "denied")) !== "granted") {
    compassBtn.textContent = "Compass not allowed";
    compassBtn.disabled = true;
    return;
  }
  // Chrome on Android gives north-referenced readings on a separate event.
  window.addEventListener("ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation", onOrientation);
  following = true;
  compassBtn.textContent = "Keep north up";
  compassBtn.setAttribute("aria-pressed", "true");
  setTimeout(() => {
    if (heading == null) {
      following = false;
      compassBtn.textContent = "No compass on this device";
      compassBtn.disabled = true;
      compassBtn.setAttribute("aria-pressed", "false");
    }
  }, 3000);
  scheduleDraw();
}

if ("DeviceOrientationEvent" in window) {
  compassBtn.hidden = false;
  compassBtn.addEventListener("click", () => {
    if (!following && heading == null) {
      void startCompass();
      return;
    }
    following = !following;
    compassBtn.textContent = following ? "Keep north up" : "Turn with my phone";
    compassBtn.setAttribute("aria-pressed", String(following));
    scheduleDraw();
  });
}
