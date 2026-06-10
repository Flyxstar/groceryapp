import { LatLng, Store, TransportMode } from "@/lib/types";
import { roadKm } from "@/lib/geo";

export const MODES: { id: TransportMode; label: string; emoji: string }[] = [
  { id: "car", label: "Bil", emoji: "🚗" },
  { id: "bike", label: "Cykel", emoji: "🚲" },
  { id: "walk", label: "Gå", emoji: "🚶" },
  { id: "transit", label: "Kollektivt", emoji: "🚌" },
];

/** Free-flow speeds, km/h. Car is urban average; transit includes stops. */
const SPEED: Record<TransportMode, number> = {
  car: 38,
  bike: 16,
  walk: 4.8,
  transit: 22,
};

/** Fixed overhead per leg in minutes (parking, unlocking the bike, waiting for the bus...). */
const LEG_OVERHEAD_MIN: Record<TransportMode, number> = {
  car: 4,
  bike: 2,
  walk: 0,
  transit: 7,
};

/**
 * Relative road-traffic level 0..1 by hour and weekday (0=Mon..6=Sun).
 * Mirrors the live congestion factor a TomTom/Mapbox traffic API returns.
 * Stockholm pattern: weekday rush 7–9 and 15–18, calm evenings/weekends.
 */
export function trafficLevel(hour: number, weekday: number): number {
  if (weekday >= 5) {
    // weekends: mild midday bump
    return 0.15 + 0.35 * Math.exp(-((hour - 13) ** 2) / 10);
  }
  const morning = 0.85 * Math.exp(-((hour - 8) ** 2) / 2.2);
  const evening = 1.0 * Math.exp(-((hour - 16.5) ** 2) / 3.2);
  return Math.min(1, 0.1 + morning + evening);
}

export function trafficLabel(level: number): { text: string; color: string } {
  if (level < 0.3) return { text: "Lätt trafik", color: "#16a34a" };
  if (level < 0.6) return { text: "Måttlig trafik", color: "#d97706" };
  return { text: "Tung trafik", color: "#dc2626" };
}

/** One leg's duration in minutes at a given hour. Traffic only matters for car/transit. */
export function legMinutes(
  from: LatLng,
  to: LatLng,
  mode: TransportMode,
  hour: number,
  weekday: number
): number {
  const km = roadKm(from, to);
  let speed = SPEED[mode];
  if (mode === "car") {
    speed = speed * (1 - 0.55 * trafficLevel(hour, weekday)); // congestion slows you down
  }
  if (mode === "transit") {
    speed = speed * (1 - 0.2 * trafficLevel(hour, weekday)); // buses share the road a bit
  }
  return (km / speed) * 60 + LEG_OVERHEAD_MIN[mode];
}

/** Minutes spent inside a store given item count and how busy it is (0..1). */
export function inStoreMinutes(itemCount: number, busyness: number): number {
  const base = 5 + itemCount * 1.4;
  const queueFactor = 1 + busyness * 0.9; // a packed store nearly doubles the visit
  return base * queueFactor;
}

export interface TripLeg {
  from: string;
  to: string;
  minutes: number;
  km: number;
}

export interface TripPlan {
  /** stores in visiting order (nearest-neighbour from home) */
  order: Store[];
  legs: TripLeg[];
  travelMinutes: number;
  shoppingMinutes: number;
  totalMinutes: number;
  totalKm: number;
}

/**
 * Plan home -> store -> store -> ... -> home using nearest-neighbour order,
 * which matches "closest store first" in the shopping list.
 */
export function planTrip(
  home: LatLng,
  stores: Store[],
  itemsPerStore: Map<string, number>,
  mode: TransportMode,
  departHour: number,
  weekday: number
): TripPlan {
  const order = orderByNearest(home, stores);
  const legs: TripLeg[] = [];
  let cursor = home;
  let cursorName = "Hem";
  let travelMinutes = 0;
  let shoppingMinutes = 0;
  let totalKm = 0;
  let clock = departHour;

  for (const store of order) {
    const mins = legMinutes(cursor, store, mode, clock, weekday);
    legs.push({ from: cursorName, to: store.name, minutes: mins, km: roadKm(cursor, store) });
    travelMinutes += mins;
    totalKm += roadKm(cursor, store);
    clock += mins / 60;
    const busy = busynessAt(store, Math.floor(clock) % 24, weekday);
    const visit = inStoreMinutes(itemsPerStore.get(store.id) ?? 0, busy);
    shoppingMinutes += visit;
    clock += visit / 60;
    cursor = store;
    cursorName = store.name;
  }
  if (order.length > 0) {
    const mins = legMinutes(cursor, home, mode, Math.floor(clock) % 24, weekday);
    legs.push({ from: cursorName, to: "Hem", minutes: mins, km: roadKm(cursor, home) });
    travelMinutes += mins;
    totalKm += roadKm(cursor, home);
  }

  return {
    order,
    legs,
    travelMinutes,
    shoppingMinutes,
    totalMinutes: travelMinutes + shoppingMinutes,
    totalKm,
  };
}

export function orderByNearest(home: LatLng, stores: Store[]): Store[] {
  const remaining = [...stores];
  const order: Store[] = [];
  let cursor: LatLng = home;
  while (remaining.length) {
    remaining.sort((a, b) => roadKm(cursor, a) - roadKm(cursor, b));
    const next = remaining.shift()!;
    order.push(next);
    cursor = next;
  }
  return order;
}

export function busynessAt(store: Store, hour: number, weekday: number): number {
  return store.popularTimes[weekday]?.[hour] ?? 0;
}

export interface TimeSuggestion {
  hour: number;
  weekday: number;
  label: string;
  score: number; // lower is better
  busyness: number;
  traffic: number;
  totalMinutes: number;
}

const DAY_NAMES = ["måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag", "söndag"];

/**
 * Score every viable departure hour today and tomorrow and pick the best:
 * a weighted blend of store busyness, traffic level and total trip time.
 */
export function suggestTimes(
  home: LatLng,
  stores: Store[],
  itemsPerStore: Map<string, number>,
  mode: TransportMode,
  now: Date
): TimeSuggestion[] {
  const out: TimeSuggestion[] = [];
  const nowWeekday = (now.getDay() + 6) % 7; // JS sunday=0 -> our monday=0
  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    const weekday = (nowWeekday + dayOffset) % 7;
    const startHour = dayOffset === 0 ? now.getHours() + 1 : 7;
    for (let hour = startHour; hour <= 21; hour++) {
      // every selected store must be open for the whole visit
      if (stores.some((s) => hour < s.opens || hour >= s.closes - 1)) continue;
      const plan = planTrip(home, stores, itemsPerStore, mode, hour, weekday);
      const avgBusy =
        stores.reduce((acc, s) => acc + busynessAt(s, hour, weekday), 0) /
        Math.max(stores.length, 1);
      const traffic = trafficLevel(hour, weekday);
      const trafficWeight = mode === "car" ? 1 : mode === "transit" ? 0.4 : 0;
      const score = avgBusy * 1.0 + traffic * trafficWeight + plan.totalMinutes / 200;
      out.push({
        hour,
        weekday,
        label: `${dayOffset === 0 ? "idag" : "imorgon"} (${DAY_NAMES[weekday]}) kl ${String(hour).padStart(2, "0")}:00`,
        score,
        busyness: avgBusy,
        traffic,
        totalMinutes: plan.totalMinutes,
      });
    }
  }
  return out.sort((a, b) => a.score - b.score);
}

export function fmtMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
