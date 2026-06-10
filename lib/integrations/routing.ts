/**
 * Live routing adapters. Each provider is used automatically when its API key
 * is present in the environment; otherwise the app falls back to the local
 * estimator in lib/travel.ts.
 *
 *   TRAFIKLAB_RESROBOT_KEY  – Trafiklab ResRobot v2.1 (Sweden-wide public transit)
 *                             https://www.trafiklab.se/api/our-apis/resrobot-v21/
 *   TOMTOM_API_KEY          – TomTom Routing with live traffic (car)
 *                             https://developer.tomtom.com/routing-api/documentation
 *   OSRM_URL                – Any OSRM instance for bike/walk (no key needed;
 *                             defaults to the public demo server if set to "demo")
 */
import { LatLng, TransportMode } from "@/lib/types";

export interface RouteResult {
  minutes: number;
  km: number;
  provider: string;
  /** 0..1 congestion on the route (car only) */
  trafficLevel?: number;
}

export async function routeWithLiveProvider(
  from: LatLng,
  to: LatLng,
  mode: TransportMode
): Promise<RouteResult | null> {
  try {
    if (mode === "transit" && process.env.TRAFIKLAB_RESROBOT_KEY) {
      return await resrobotRoute(from, to);
    }
    if (mode === "car" && process.env.TOMTOM_API_KEY) {
      return await tomtomRoute(from, to);
    }
    if ((mode === "bike" || mode === "walk") && process.env.OSRM_URL) {
      return await osrmRoute(from, to, mode);
    }
  } catch (err) {
    console.warn(`Live routing failed for ${mode}, falling back to estimate:`, err);
  }
  return null;
}

async function resrobotRoute(from: LatLng, to: LatLng): Promise<RouteResult> {
  const key = process.env.TRAFIKLAB_RESROBOT_KEY!;
  const url =
    `https://api.resrobot.se/v2.1/trip?format=json&accessId=${key}` +
    `&originCoordLat=${from.lat}&originCoordLong=${from.lng}` +
    `&destCoordLat=${to.lat}&destCoordLong=${to.lng}&numF=1`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`ResRobot ${res.status}`);
  const data = await res.json();
  const trip = data.Trip?.[0];
  if (!trip) throw new Error("No transit trip found");
  // duration format: PT1H23M
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(trip.duration ?? "");
  const minutes = (Number(m?.[1] ?? 0) * 60 + Number(m?.[2] ?? 0)) || 30;
  return { minutes, km: 0, provider: "Trafiklab ResRobot" };
}

async function tomtomRoute(from: LatLng, to: LatLng): Promise<RouteResult> {
  const key = process.env.TOMTOM_API_KEY!;
  const url =
    `https://api.tomtom.com/routing/1/calculateRoute/` +
    `${from.lat},${from.lng}:${to.lat},${to.lng}/json?key=${key}&traffic=true`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`TomTom ${res.status}`);
  const data = await res.json();
  const summary = data.routes?.[0]?.summary;
  if (!summary) throw new Error("No car route found");
  const minutes = summary.travelTimeInSeconds / 60;
  const freeFlow = summary.noTrafficTravelTimeInSeconds ?? summary.travelTimeInSeconds;
  return {
    minutes,
    km: summary.lengthInMeters / 1000,
    provider: "TomTom Traffic",
    trafficLevel: Math.max(0, Math.min(1, (summary.travelTimeInSeconds - freeFlow) / Math.max(freeFlow, 1))),
  };
}

async function osrmRoute(from: LatLng, to: LatLng, mode: "bike" | "walk"): Promise<RouteResult> {
  const base =
    process.env.OSRM_URL === "demo" ? "https://router.project-osrm.org" : process.env.OSRM_URL!;
  const profile = mode === "bike" ? "cycling" : "walking";
  const url = `${base}/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No route found");
  return { minutes: route.duration / 60, km: route.distance / 1000, provider: "OSRM" };
}
