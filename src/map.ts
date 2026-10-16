// The street map: you at the centre with a ring at the search radius, and each plane
// as an arrow pointing the way it's flying. Tiles come from OpenStreetMap.

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Sighting } from "./aircraft";
import type { LatLon } from "./geo";

const PLANE_PATH =
  "M12 2 L13.6 8.4 L22 12.6 L22 14.4 L13.6 12.2 L13 17.6 L15.6 19.6 L15.6 21 L12 20 L8.4 21 L8.4 19.6 L11 17.6 L10.4 12.2 L2 14.4 L2 12.6 L10.4 8.4 Z";

export class SkyMap {
  private map: L.Map;
  private ring: L.Circle | null = null;
  private you: L.Marker | null = null;
  private planes = new Map<string, L.Marker>();
  private centre: LatLon | null = null;
  private heading: number | null = null;

  constructor(
    el: HTMLElement,
    private radiusM: number,
    private onPick: (id: string) => void,
  ) {
    this.map = L.map(el, { zoomControl: false, attributionControl: true, zoomSnap: 0.25 });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    this.map.attributionControl.setPrefix(false);
  }

  /** Moves the map to the viewer. Only re-centres when they've moved more than about 500 m. */
  setViewer(at: LatLon) {
    const ll = L.latLng(at.lat, at.lon);
    if (this.centre && ll.distanceTo([this.centre.lat, this.centre.lon]) < 500) return;
    this.centre = at;
    if (!this.ring) {
      this.ring = L.circle(ll, { radius: this.radiusM, className: "map-ring", interactive: false }).addTo(this.map);
      this.you = L.marker(ll, { icon: this.youIcon(), interactive: false, keyboard: false, zIndexOffset: -1000 }).addTo(this.map);
    } else {
      this.ring.setLatLng(ll);
      this.you!.setLatLng(ll);
    }
    // toBounds works before the map has a view; the circle's own getBounds doesn't.
    this.map.fitBounds(ll.toBounds(this.radiusM * 2), { padding: [8, 8] });
  }

  /** Points the "you" marker's cone the way the phone is facing (null hides it). */
  setHeading(deg: number | null) {
    this.heading = deg;
    this.you?.setIcon(this.youIcon());
  }

  update(sightings: Sighting[], topId: string | null) {
    const seen = new Set<string>();
    for (const s of sightings) {
      seen.add(s.id);
      const icon = planeIcon(s, s.id === topId);
      const pos = L.latLng(s.position.lat, s.position.lon);
      const existing = this.planes.get(s.id);
      if (existing) {
        existing.setLatLng(pos).setIcon(icon);
      } else {
        const m = L.marker(pos, { icon, keyboard: true, title: s.callsign ?? s.id }).addTo(this.map);
        m.on("click", () => this.onPick(s.id));
        this.planes.set(s.id, m);
      }
    }
    for (const [id, m] of this.planes) {
      if (!seen.has(id)) {
        m.remove();
        this.planes.delete(id);
      }
    }
  }

  private youIcon(): L.DivIcon {
    const cone =
      this.heading == null
        ? ""
        : `<svg class="you-cone" viewBox="-40 -40 80 80" style="transform:rotate(${Math.round(this.heading)}deg)"><path d="M0 0 L-14 -36 A38 38 0 0 1 14 -36 Z"/></svg>`;
    return L.divIcon({
      className: "you-icon",
      html: `${cone}<span class="you-halo"></span><span class="you-dot"></span>`,
      iconSize: [80, 80],
      iconAnchor: [40, 40],
    });
  }
}

function planeIcon(s: Sighting, top: boolean): L.DivIcon {
  const rot = Math.round(s.trackDeg ?? 0);
  const label = escapeHtml(s.callsign ?? s.registration ?? s.id.toUpperCase());
  return L.divIcon({
    className: top ? "plane-icon top" : "plane-icon",
    html: `<svg viewBox="0 0 24 24" style="transform:rotate(${rot}deg)"><path d="${PLANE_PATH}"/></svg><span>${label}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
