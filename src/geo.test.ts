import { describe, expect, it } from "vitest";
import { bearingDeg, compassPoint, distanceM, elevationDeg } from "./geo";

describe("geo", () => {
  it("measures one degree of latitude as ~111 km", () => {
    expect(distanceM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111_195, -2);
  });
  it("gives cardinal bearings", () => {
    expect(bearingDeg({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(0);
    expect(bearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(90);
    expect(bearingDeg({ lat: 0, lon: 0 }, { lat: -1, lon: 0 })).toBeCloseTo(180);
  });
  it("puts a plane right above at 90° elevation", () => {
    expect(elevationDeg(0, 35_000)).toBeCloseTo(90);
  });
  it("puts a plane 10 km out at 10,000 ft roughly 17° up", () => {
    expect(elevationDeg(10_000, 10_000)).toBeCloseTo(16.8, 0);
  });
  it("drops planes far away below the horizon", () => {
    expect(elevationDeg(500_000, 35_000)).toBeLessThan(0);
  });
  it("names compass points", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(350)).toBe("N");
    expect(compassPoint(135)).toBe("SE");
    expect(compassPoint(-90)).toBe("W");
  });
});
