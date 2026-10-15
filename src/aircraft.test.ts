import { describe, expect, it, vi } from "vitest";
import { toSightings } from "./aircraft";
import { fetchAircraft, type RawAircraft } from "./feed";

const viewer = { lat: 51.47, lon: -0.45 };

describe("toSightings", () => {
  it("sorts by height in the sky and skips grounded or unplaced aircraft", () => {
    const raw: RawAircraft[] = [
      { hex: "far", lat: 51.6, lon: -0.45, alt_baro: 5000 },
      { hex: "above", flight: "BAW123  ", t: "A320", desc: "AIRBUS A-320", lat: 51.471, lon: -0.45, alt_baro: 4000, gs: 180 },
      { hex: "ground", lat: 51.47, lon: -0.45, alt_baro: "ground" },
      { hex: "nopos", alt_baro: 30000 },
    ];
    const out = toSightings(raw, viewer);
    expect(out.map((s) => s.id)).toEqual(["above", "far"]);
    expect(out[0].callsign).toBe("BAW123");
    expect(out[0].typeName).toBe("AIRBUS A-320");
    expect(out[0].elevationDeg).toBeGreaterThan(80);
  });
});

describe("fetchAircraft", () => {
  it("falls back to the second feed when the first fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(Response.json({ ac: [{ hex: "abc" }] }));
    const ac = await fetchAircraft(viewer, 15, fetchMock as unknown as typeof fetch);
    expect(ac).toEqual([{ hex: "abc" }]);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.airplanes.live/v2/point/51.4700/-0.4500/15");
    expect(fetchMock.mock.calls[1][0]).toMatch(/^https:\/\/api\.adsb\.lol\//);
  });
});
