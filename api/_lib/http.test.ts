import { describe, expect, it } from "vitest";
import { placeName } from "../place";
import { parsePoint } from "./http";

describe("parsePoint", () => {
  it("snaps to two decimals", () => {
    expect(parsePoint(new URLSearchParams("lat=51.4712&lon=-0.4549"))).toEqual({ lat: 51.47, lon: -0.45 });
  });

  it("rejects missing or impossible positions", () => {
    expect(parsePoint(new URLSearchParams("lat=51"))).toBeNull();
    expect(parsePoint(new URLSearchParams("lat=95&lon=0"))).toBeNull();
    expect(parsePoint(new URLSearchParams("lat=abc&lon=0"))).toBeNull();
  });
});

describe("placeName", () => {
  it("joins the neighbourhood and the city", () => {
    expect(placeName({ suburb: "Hounslow", city: "London", country: "United Kingdom" })).toBe("Hounslow, London");
  });

  it("doesn't repeat a town that is also the wider area", () => {
    expect(placeName({ town: "Staines", county: "Surrey" })).toBe("Staines, Surrey");
    expect(placeName({ city: "Paris" })).toBe("Paris");
  });
});
