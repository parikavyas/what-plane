import { describe, expect, it } from "vitest";
import { headingFromOrientation, radarPoint, ringDistances } from "./radar";

describe("radarPoint", () => {
  it("puts a plane due north straight up from centre", () => {
    const p = radarPoint(0, 10, 10, 100);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-100);
  });
  it("puts a plane due east to the right, halfway out", () => {
    const p = radarPoint(90, 5, 10, 100);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(0);
  });
  it("pins planes beyond range to the edge", () => {
    const p = radarPoint(180, 40, 10, 100);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(100);
  });
  it("rotates with the heading so what's ahead is up", () => {
    // Facing east, a plane to the east should be straight ahead.
    const p = radarPoint(90, 10, 10, 100, 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-100);
  });
});

describe("ringDistances", () => {
  it("spaces three rings out to the range", () => {
    expect(ringDistances(15)).toEqual([5, 10, 15]);
  });
});

describe("headingFromOrientation", () => {
  it("uses the iOS compass heading as is", () => {
    expect(headingFromOrientation({ alpha: 10, webkitCompassHeading: 250 })).toBe(250);
  });
  it("converts absolute alpha, which turns the other way", () => {
    expect(headingFromOrientation({ alpha: 90, absolute: true })).toBe(270);
  });
  it("ignores relative alpha, which isn't tied to north", () => {
    expect(headingFromOrientation({ alpha: 90, absolute: false })).toBeNull();
  });
  it("corrects for a rotated screen", () => {
    expect(headingFromOrientation({ alpha: null, webkitCompassHeading: 350 }, 90)).toBe(80);
  });
});
