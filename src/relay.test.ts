import { describe, expect, it, vi } from "vitest";
import { fetchAircraft } from "./feed";
import { viaRelay } from "./relay";

describe("viaRelay", () => {
  it("goes straight to the feed when no relay is set", () => {
    expect(viaRelay("adsb.lol", "/v2/point", "")).toBe("https://api.adsb.lol/v2/point");
  });

  it("routes through the relay when one is set", () => {
    expect(viaRelay("airplanes.live", "/v2/point", "https://relay.example.dev")).toBe(
      "https://relay.example.dev/airplanes.live/v2/point",
    );
  });
});

describe("fetchAircraft errors", () => {
  it("explains a blocked feed instead of the browser's bare message", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Load failed"));
    await expect(
      fetchAircraft({ lat: 51.47, lon: -0.45 }, 15, fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/no feed relay is set up/);
  });
});
