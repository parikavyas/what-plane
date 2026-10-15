import { describe, expect, it, vi } from "vitest";
import { fetchRoutes, formatRoute, RouteCache, ROUTESET_URL } from "./routes";

const jfk = { iata: "JFK", icao: "KJFK", location: "New York", name: "John F Kennedy International Airport" };
const lax = { iata: "LAX", icao: "KLAX", location: "Los Angeles", name: "Los Angeles International Airport" };

// Mirrors the adsb.lol routeset reply.
const reply = [
  { callsign: "DAL123", plausible: true, _airport_codes_iata: "JFK-LAX", _airports: [jfk, lax] },
  { callsign: "UAL9", plausible: false, _airport_codes_iata: "LAX-JFK", _airports: [lax, jfk] },
];

describe("fetchRoutes", () => {
  it("posts callsigns with positions and keeps only plausible routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(reply));
    const routes = await fetchRoutes(
      [
        { callsign: "DAL123", lat: 40, lon: -100 },
        { callsign: "UAL9", lat: 41, lon: -101 },
        { callsign: "AAL1", lat: 42, lon: -102 },
      ],
      fetchMock as unknown as typeof fetch,
    );
    expect(fetchMock.mock.calls[0][0]).toBe(ROUTESET_URL);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).planes[0]).toEqual({ callsign: "DAL123", lat: 40, lng: -100 });
    expect(formatRoute(routes.get("DAL123")!)).toBe("New York (JFK) → Los Angeles (LAX)");
    expect(routes.get("UAL9")).toBeNull();
    expect(routes.get("AAL1")).toBeNull();
  });

  it("uses the first and last stop of a multi-leg route", async () => {
    const mid = { iata: "ORD", icao: "KORD", location: "Chicago" };
    const fetchMock = vi.fn().mockResolvedValue(Response.json([{ callsign: "SWA7", plausible: 1, _airports: [jfk, mid, lax] }]));
    const routes = await fetchRoutes([{ callsign: "SWA7", lat: 0, lon: 0 }], fetchMock as unknown as typeof fetch);
    expect(formatRoute(routes.get("SWA7")!)).toBe("New York (JFK) → Los Angeles (LAX)");
  });
});

describe("RouteCache", () => {
  it("looks each flight up once and backs off after a failure", async () => {
    let now = 0;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(reply))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json([]));
    const cache = new RouteCache(fetchMock as unknown as typeof fetch, () => now);

    expect(await cache.load([{ callsign: "DAL123", lat: 0, lon: 0 }])).toBe(true);
    expect(await cache.load([{ callsign: "DAL123", lat: 0, lon: 0 }])).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cache.get("DAL123")?.destination.iata).toBe("LAX");

    await expect(cache.load([{ callsign: "BAW1", lat: 0, lon: 0 }])).rejects.toThrow("offline");
    expect(await cache.load([{ callsign: "BAW1", lat: 0, lon: 0 }])).toBe(false); // still backing off
    now += 3 * 60_000;
    expect(await cache.load([{ callsign: "BAW1", lat: 0, lon: 0 }])).toBe(false); // retried, no route known
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
