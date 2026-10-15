// Sky view: a radar-style plot with you at the centre, north (or your phone's heading) up,
// and distance as radius. Pure geometry is exported separately so it can be tested.

import type { Sighting } from "./aircraft";

export interface Point {
  x: number;
  y: number;
}

/**
 * Where a plane lands on a radar of the given radius (centre at 0,0, y down like SVG).
 * `headingDeg` is the direction the top of the screen faces; 0 keeps north up.
 * Planes beyond `rangeNm` are pinned to the edge so they stay visible.
 */
export function radarPoint(bearingDeg: number, distanceNm: number, rangeNm: number, radius: number, headingDeg = 0): Point {
  const r = (Math.min(Math.max(distanceNm, 0), rangeNm) / rangeNm) * radius;
  const a = ((bearingDeg - headingDeg) * Math.PI) / 180;
  return { x: r * Math.sin(a), y: -r * Math.cos(a) };
}

/** Distances for range rings: three evenly spaced rings out to the range. */
export function ringDistances(rangeNm: number, count = 3): number[] {
  return Array.from({ length: count }, (_, i) => (rangeNm * (i + 1)) / count);
}

/** The subset of DeviceOrientationEvent we read; iOS adds webkitCompassHeading. */
export interface OrientationReading {
  alpha: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
}

/**
 * Compass heading (degrees clockwise from north) the top of the screen faces, or null if the
 * reading can't give one. iOS reports webkitCompassHeading directly; elsewhere an absolute
 * alpha is counter-clockwise from north. `screenAngle` corrects for a rotated screen.
 */
export function headingFromOrientation(e: OrientationReading, screenAngle = 0): number | null {
  let h: number;
  if (typeof e.webkitCompassHeading === "number" && !Number.isNaN(e.webkitCompassHeading)) {
    h = e.webkitCompassHeading;
  } else if (e.absolute && typeof e.alpha === "number") {
    h = 360 - e.alpha;
  } else {
    return null;
  }
  return (((h + screenAngle) % 360) + 360) % 360;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const SIZE = 320;
const R = SIZE / 2 - 22; // leave room for the N/E/S/W labels

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** Draw the radar into `host`, replacing what was there. The first sighting is highlighted. */
export function renderRadar(host: Element, sightings: Sighting[], rangeNm: number, headingDeg = 0): void {
  const root = svg("svg", {
    viewBox: `${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`,
    role: "img",
    class: "radar",
  });
  const title = svg("title", {});
  title.textContent = `Sky view: ${sightings.length} plane${sightings.length === 1 ? "" : "s"} around you, ${headingDeg ? "rotated to your heading" : "north up"}`;
  root.append(title);

  root.append(svg("circle", { r: R, class: "radar-bg" }));
  for (const d of ringDistances(rangeNm)) {
    const r = (d / rangeNm) * R;
    root.append(svg("circle", { r, class: "radar-ring" }));
    const label = svg("text", { x: 3, y: -r + 11, class: "radar-ring-label" });
    label.textContent = `${Math.round(d)} nm`;
    root.append(label);
  }

  for (const [name, deg] of [["N", 0], ["E", 90], ["S", 180], ["W", 270]] as const) {
    const p = radarPoint(deg, rangeNm, rangeNm, R + 12, headingDeg);
    const label = svg("text", { x: p.x, y: p.y, class: name === "N" ? "radar-cardinal north" : "radar-cardinal" });
    label.textContent = name;
    root.append(label);
  }
  root.append(svg("circle", { r: 4, class: "radar-you" }));

  // Draw the highlighted plane last so it sits on top.
  sightings
    .map((s, i) => ({ s, top: i === 0 }))
    .reverse()
    .forEach(({ s, top }) => {
      const p = radarPoint(s.bearingDeg, s.distanceNm, rangeNm, R, headingDeg);
      const g = svg("g", { class: top ? "radar-plane top" : "radar-plane", transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` });
      const name = s.callsign ?? s.registration ?? s.id.toUpperCase();
      const tip = svg("title", {});
      tip.textContent = `${name}: ${s.distanceNm.toFixed(1)} nm, ${Math.round(s.elevationDeg)}° up`;
      g.append(tip);
      if (s.trackDeg == null) {
        g.append(svg("circle", { r: 4 }));
      } else {
        // An arrowhead pointing the way the plane is flying, relative to the screen.
        g.append(svg("path", { d: "M0,-7 L5,5 L0,2 L-5,5 Z", transform: `rotate(${(s.trackDeg - headingDeg).toFixed(0)})` }));
      }
      const label = svg("text", { x: 8, y: 4, class: "radar-label" });
      label.textContent = name;
      g.append(label);
      root.append(g);
    });

  host.replaceChildren(root);
}
