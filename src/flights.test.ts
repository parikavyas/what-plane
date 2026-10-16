import { describe, expect, it, vi } from "vitest";
import { FlightTimesCache } from "./flights";

const times = { origin: null, destination: null, takeOff: "2026-10-16T08:12:00Z", tookOff: true, landing: null };

describe("FlightTimesCache", () => {
  it("looks each callsign up once and keeps the answer", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ available: true, flight: times })));
    const cache = new FlightTimesCache(fetchMock as unknown as typeof fetch, () => 0);
    expect(await cache.load(["BAW117"])).toBe(true);
    expect(await cache.load(["BAW117"])).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/flight?callsign=BAW117");
    expect(cache.get("BAW117")).toEqual(times);
  });

  it("stops asking once the server says times aren't set up", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ available: false })));
    const cache = new FlightTimesCache(fetchMock as unknown as typeof fetch);
    await cache.load(["A1", "B2", "C3", "D4", "E5"]);
    await cache.load(["F6"]);
    expect(cache.available).toBe(false);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3);
  });
});
