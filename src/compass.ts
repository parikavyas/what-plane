// Which way the phone is facing, from its compass. iOS only shares it after a tap.

import { headingFromOrientation, type OrientationReading } from "./radar";

type PermissionRequester = { requestPermission?: () => Promise<"granted" | "denied"> };

export function compassSupported(): boolean {
  return "DeviceOrientationEvent" in window;
}

/** Starts listening; calls back with degrees from north. Resolves false if the user said no. */
export async function startCompass(onHeading: (deg: number) => void): Promise<boolean> {
  const req = (window.DeviceOrientationEvent as unknown as PermissionRequester).requestPermission;
  if (req && (await req().catch(() => "denied")) !== "granted") return false;
  let last: number | null = null;
  const handler = (e: Event) => {
    const h = headingFromOrientation(e as unknown as OrientationReading, screen.orientation?.angle ?? 0);
    if (h == null) return;
    // Skip tiny jitters so we're not redrawing constantly.
    if (last != null && Math.abs(((h - last + 540) % 360) - 180) < 3) return;
    last = h;
    onHeading(h);
  };
  // Chrome on Android gives north-referenced readings on a separate event.
  window.addEventListener("ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation", handler);
  return true;
}
