import { describe, expect, it } from "vitest";
import { parseCallsign } from "./airlines";
import { aircraftTypeName } from "./types";

describe("parseCallsign", () => {
  it("names the airline behind an airline callsign", () => {
    expect(parseCallsign("DAL123")).toEqual({ code: "DAL", number: "123", name: "Delta Air Lines" });
    expect(parseCallsign(" ezy45kp ")).toEqual({ code: "EZY", number: "45KP", name: "easyJet" });
  });
  it("keeps unknown airlines so their route can still be looked up", () => {
    expect(parseCallsign("XYZ9")).toEqual({ code: "XYZ", number: "9", name: null });
  });
  it("ignores registrations and other non-flight callsigns", () => {
    expect(parseCallsign("N123AB")).toBeNull();
    expect(parseCallsign("GABCD")).toBeNull();
    expect(parseCallsign(null)).toBeNull();
  });
});

describe("aircraftTypeName", () => {
  it("uses the plain name for known type codes", () => {
    expect(aircraftTypeName("A21N", "AIRBUS A-321neo")).toBe("Airbus A321neo");
    expect(aircraftTypeName("b38m", null)).toBe("Boeing 737 MAX 8");
  });
  it("tidies the feed description for types not in the table", () => {
    expect(aircraftTypeName("ZZZZ", "DE HAVILLAND CANADA DHC-6 TWIN OTTER")).toBe(
      "De Havilland Canada DHC-6 Twin Otter",
    );
  });
  it("falls back to the bare code, then nothing", () => {
    expect(aircraftTypeName("ZZZZ", null)).toBe("ZZZZ");
    expect(aircraftTypeName(null, null)).toBeNull();
  });
});
