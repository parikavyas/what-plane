// Geometry helpers for working out where an aircraft sits relative to the viewer.

const EARTH_RADIUS_M = 6_371_000;
const FEET_TO_M = 0.3048;
export const M_PER_NM = 1852;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance in metres (haversine). */
export function distanceM(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees clockwise from true north (0–360). */
export function bearingDeg(a: LatLon, b: LatLon): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Angle above the horizon at which the viewer sees the aircraft, in degrees.
 * 90 means straight overhead. Accounts for Earth curvature, which matters past ~20 km.
 */
export function elevationDeg(groundDistanceM: number, altitudeFt: number): number {
  const h = altitudeFt * FEET_TO_M;
  const θ = groundDistanceM / EARTH_RADIUS_M;
  const r = EARTH_RADIUS_M + h;
  // Position of aircraft relative to viewer, in the viewer's local vertical plane.
  const horizontal = r * Math.sin(θ);
  const vertical = r * Math.cos(θ) - EARTH_RADIUS_M;
  return toDeg(Math.atan2(vertical, horizontal));
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function compassPoint(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
