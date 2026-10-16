// Take-off and landing times per callsign, from /api/flight (FlightAware behind it).
// Each flight is looked up at most once every 20 minutes, which keeps the free
// FlightAware allowance going a long way.

export interface Airport {
  code: string | null;
  city: string | null;
}

export interface FlightTimes {
  origin: Airport | null;
  destination: Airport | null;
  takeOff: string | null;
  tookOff: boolean;
  landing: string | null;
}

const TTL_MS = 20 * 60_000;
const MAX_IN_FLIGHT = 3;

export class FlightTimesCache {
  /** False once the server says no FlightAware key is set, so we stop asking. */
  available = true;
  private entries = new Map<string, { times: FlightTimes | null; at: number }>();
  private pending = new Set<string>();

  constructor(
    // Wrapped so fetch isn't called with this cache as `this`, which browsers reject.
    private fetchImpl: typeof fetch = (...args) => fetch(...args),
    private now: () => number = Date.now,
  ) {}

  get(callsign: string): FlightTimes | null {
    return this.entries.get(callsign)?.times ?? null;
  }

  /** Looks up callsigns not cached yet. Resolves true when new times arrived. */
  async load(callsigns: string[]): Promise<boolean> {
    if (!this.available) return false;
    const now = this.now();
    const todo = callsigns.filter((c) => {
      const hit = this.entries.get(c);
      return !this.pending.has(c) && (!hit || now - hit.at > TTL_MS);
    });
    let changed = false;
    for (let i = 0; i < todo.length && this.available; i += MAX_IN_FLIGHT) {
      const batch = todo.slice(i, i + MAX_IN_FLIGHT);
      const results = await Promise.all(batch.map((c) => this.one(c)));
      changed ||= results.some(Boolean);
    }
    return changed;
  }

  private async one(callsign: string): Promise<boolean> {
    this.pending.add(callsign);
    try {
      const res = await this.fetchImpl(`/api/flight?callsign=${encodeURIComponent(callsign)}`);
      const body = (await res.json()) as { available?: boolean; flight?: FlightTimes | null };
      if (body.available === false) {
        this.available = false;
        return false;
      }
      if (!res.ok) return false; // try again on a later refresh
      this.entries.set(callsign, { times: body.flight ?? null, at: this.now() });
      return Boolean(body.flight);
    } catch {
      return false;
    } finally {
      this.pending.delete(callsign);
    }
  }
}

/** "21:12" in the viewer's own time zone. */
export function clockTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
