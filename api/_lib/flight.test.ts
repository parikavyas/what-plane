import { describe, expect, it } from "vitest";
import { pickAirborne } from "./flight";

describe("pickAirborne", () => {
  it("picks the leg that has taken off but not landed", () => {
    const out = pickAirborne([
      { actual_off: null, scheduled_off: "2026-10-16T20:00:00Z", origin: { code_iata: "JFK" } },
      {
        actual_off: "2026-10-16T08:12:00Z",
        actual_on: null,
        estimated_on: "2026-10-16T15:55:00Z",
        origin: { code_iata: "LHR", city: "London" },
        destination: { code_iata: "JFK", city: "New York" },
      },
      { actual_off: "2026-10-15T08:10:00Z", actual_on: "2026-10-15T15:40:00Z" },
    ]);
    expect(out).toEqual({
      origin: { code: "LHR", city: "London" },
      destination: { code: "JFK", city: "New York" },
      takeOff: "2026-10-16T08:12:00Z",
      tookOff: true,
      landing: "2026-10-16T15:55:00Z",
    });
  });

  it("returns null when no leg is in the air", () => {
    expect(pickAirborne([{ actual_off: "x", actual_on: "y" }])).toBeNull();
  });
});
