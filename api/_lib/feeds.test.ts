import { describe, expect, it, vi } from "vitest";
import { FeedRelay, SOURCES } from "./feeds";

const ok = (body: unknown) => Response.json(body);

describe("FeedRelay", () => {
  it("tries adsb.lol first and trims records to the fields the app uses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ ac: [{ hex: "abc", flight: "BAW1", lat: 1, lon: 2, emergency: "none" }] }));
    const relay = new FeedRelay(SOURCES, fetchMock as unknown as typeof fetch);
    const out = await relay.get(51.47, -0.45, 11);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.adsb.lol/v2/lat/51.47/lon/-0.45/dist/11");
    expect(out).toMatchObject({ source: "adsb.lol", stale: false });
    expect(out.ac).toEqual([{ hex: "abc", flight: "BAW1", lat: 1, lon: 2 }]);
  });

  it("falls back to the next feed and leaves a rate-limited one alone for a while", async () => {
    let t = 0;
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(url.includes("adsb.lol") ? new Response("slow down", { status: 429 }) : ok({ aircraft: [{ hex: "fi" }] })),
      );
    const relay = new FeedRelay(SOURCES, fetchMock as unknown as typeof fetch, () => t);
    expect((await relay.get(1, 2, 11)).source).toBe("adsb.fi");
    t = 10_000; // cache expired, adsb.lol still cooling down
    fetchMock.mockClear();
    await relay.get(1, 2, 11);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["https://opendata.adsb.fi/api/v2/lat/1/lon/2/dist/11"]);
  });

  it("answers repeat requests from its cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ ac: [] }));
    const relay = new FeedRelay(SOURCES, fetchMock as unknown as typeof fetch, () => 0);
    await relay.get(1, 2, 11);
    await relay.get(1, 2, 11);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serves the last good answer when every feed fails", async () => {
    let t = 0;
    const fetchMock = vi.fn().mockResolvedValueOnce(ok({ ac: [{ hex: "old" }] })).mockRejectedValue(new Error("down"));
    const relay = new FeedRelay(SOURCES, fetchMock as unknown as typeof fetch, () => t);
    await relay.get(1, 2, 11);
    t = 20_000;
    const out = await relay.get(1, 2, 11);
    expect(out).toMatchObject({ stale: true, ac: [{ hex: "old" }] });
  });

  it("gives up with a clear message when nothing was ever fetched", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("down"));
    const relay = new FeedRelay(SOURCES, fetchMock as unknown as typeof fetch);
    await expect(relay.get(1, 2, 11)).rejects.toThrow(/down or busy/);
  });
});
