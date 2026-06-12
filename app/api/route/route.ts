import { NextRequest, NextResponse } from "next/server";
import { routeWithLiveProvider } from "@/lib/integrations/routing";
import { legMinutes } from "@/lib/travel";
import { roadKm } from "@/lib/geo";
import { TransportMode } from "@/lib/types";

/**
 * GET /api/route?fromLat=..&fromLng=..&toLat=..&toLng=..&mode=car&hour=17&weekday=2
 *
 * Tries the live provider for the mode (Trafiklab / TomTom / OSRM) and falls
 * back to the built-in estimator so the app always works without keys.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const from = { lat: Number(p.get("fromLat")), lng: Number(p.get("fromLng")) };
  const to = { lat: Number(p.get("toLat")), lng: Number(p.get("toLng")) };
  const mode = (p.get("mode") ?? "car") as TransportMode;
  const hour = Number(p.get("hour") ?? new Date().getHours());
  const weekday = Number(p.get("weekday") ?? (new Date().getDay() + 6) % 7);

  if ([from.lat, from.lng, to.lat, to.lng].some(Number.isNaN)) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const live = await routeWithLiveProvider(from, to, mode);
  if (live) return NextResponse.json({ ...live, live: true });

  return NextResponse.json({
    minutes: legMinutes(from, to, mode, hour, weekday),
    km: roadKm(from, to),
    provider: "estimat (ingen API-nyckel)",
    live: false,
  });
}
