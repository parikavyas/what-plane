import { bearingDeg, distanceM, elevationDeg, M_PER_NM, type LatLon } from "./geo";
import type { RawAircraft } from "./feed";

export interface Sighting {
  id: string;
  callsign: string | null;
  registration: string | null;
  typeCode: string | null;
  typeName: string | null;
  operator: string | null;
  altitudeFt: number;
  speedKt: number | null;
  trackDeg: number | null;
  verticalRateFpm: number | null;
  distanceNm: number;
  bearingDeg: number;
  elevationDeg: number;
}

/** Turn raw feed records into sightings, nearest to overhead first. Drops grounded or position-less aircraft. */
export function toSightings(raw: RawAircraft[], viewer: LatLon): Sighting[] {
  const out: Sighting[] = [];
  for (const ac of raw) {
    if (ac.lat == null || ac.lon == null) continue;
    const alt = typeof ac.alt_baro === "number" ? ac.alt_baro : ac.alt_geom;
    if (ac.alt_baro === "ground" || alt == null) continue;
    const pos = { lat: ac.lat, lon: ac.lon };
    const dist = distanceM(viewer, pos);
    out.push({
      id: ac.hex,
      callsign: ac.flight?.trim() || null,
      registration: ac.r ?? null,
      typeCode: ac.t ?? null,
      typeName: ac.desc ?? null,
      operator: ac.ownOp ?? null,
      altitudeFt: alt,
      speedKt: ac.gs ?? null,
      trackDeg: ac.track ?? null,
      verticalRateFpm: ac.baro_rate ?? null,
      distanceNm: dist / M_PER_NM,
      bearingDeg: bearingDeg(viewer, pos),
      elevationDeg: elevationDeg(dist, Math.max(0, alt)),
    });
  }
  // Highest in the sky is what you'd see when you look up.
  return out.sort((a, b) => b.elevationDeg - a.elevationDeg);
}
