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
    expect(out[0].typeName).toBe("Airbus A320");
    expect(out[0].airline).toBe("British Airways");
    expect(out[0].flightNumber).toBe("123");
    expect(out[1].airline).toBeNull();
    expect(out[0].elevationDeg).toBeGreaterThan(80);
  });
});

describe("fetchAircraft", () => {
  it("asks our own server with the position rounded to about 1 km", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ac: [{ hex: "abc" }], source: "adsb.lol" }));
    const out = await fetchAircraft({ lat: 51.4712, lon: -0.4549 }, 11, fetchMock as unknown as typeof fetch);
    expect(out.ac).toEqual([{ hex: "abc" }]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/aircraft?lat=51.47&lon=-0.45&nm=11");
  });

  it("passes on the server's explanation when it can't get planes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: "Every flight feed is down or busy right now" }, { status: 503 }));
    await expect(fetchAircraft(viewer, 11, fetchMock as unknown as typeof fetch)).rejects.toThrow(/down or busy/);
  });

  it("says when the phone is offline", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Load failed"));
    await expect(fetchAircraft(viewer, 11, fetchMock as unknown as typeof fetch)).rejects.toThrow(/no internet/);
  });
});
