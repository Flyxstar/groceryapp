"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import GpsButton from "@/components/GpsButton";
import { useAppState } from "@/lib/app-state";
import { CHAINS } from "@/lib/data/stores";
import {
  MODES,
  busynessAt,
  fmtMinutes,
  planTrip,
  suggestTimes,
  trafficLabel,
  trafficLevel,
} from "@/lib/travel";
import { Store } from "@/lib/types";

const DAY_NAMES = ["mån", "tis", "ons", "tors", "fre", "lör", "sön"];

export default function TripPage() {
  const { cart, home, homeLabel, mode, setMode, hydrated, resolveItem, storeFor } = useAppState();
  const [now, setNow] = useState<Date | null>(null);
  const [departure, setDeparture] = useState<{ hour: number; weekday: number } | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => setNow(new Date()), []);

  const { stores, itemsPerStore } = useMemo(() => {
    const perStore = new Map<string, number>();
    const set = new Map<string, Store>();
    for (const line of cart) {
      const item = resolveItem(line.itemId);
      if (!item) continue;
      const store = storeFor(item.chain);
      set.set(store.id, store);
      perStore.set(store.id, (perStore.get(store.id) ?? 0) + line.qty);
    }
    return { stores: [...set.values()], itemsPerStore: perStore };
  }, [cart, resolveItem, storeFor]);

  // Ask the routing API which provider is live (Trafiklab/TomTom/OSRM or estimate)
  useEffect(() => {
    if (!stores.length || !now) return;
    const s = stores[0];
    fetch(
      `/api/route?fromLat=${home.lat}&fromLng=${home.lng}&toLat=${s.lat}&toLng=${s.lng}&mode=${mode}`
    )
      .then((r) => r.json())
      .then((d) => setProvider(d.provider))
      .catch(() => setProvider(null));
  }, [stores, home, mode, now]);

  if (!hydrated || !now) return null;

  if (stores.length === 0) {
    return (
      <div className="card border-dashed p-12 text-center">
        <p className="empty-glyph mx-auto">🗺️</p>
        <h1 className="mt-5 text-xl font-bold">Inget att planera ännu</h1>
        <p className="mt-1 text-stone-500">Lägg varor i listan först, så planerar vi rundan.</p>
        <Link
          href="/catalogues"
          className="mt-5 inline-block rounded-full bg-rose-600 px-5 py-2 font-bold text-white"
        >
          📰 Till reklambladen
        </Link>
      </div>
    );
  }

  const nowWeekday = (now.getDay() + 6) % 7;
  const dep = departure ?? { hour: now.getHours(), weekday: nowWeekday };
  const plan = planTrip(home, stores, itemsPerStore, mode, dep.hour, dep.weekday);
  const traffic = trafficLevel(dep.hour, dep.weekday);
  const tl = trafficLabel(traffic);
  const suggestions = suggestTimes(home, stores, itemsPerStore, mode, now).slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Planera din handlingsrunda</h1>
        <p className="text-stone-500">
          Från <b>{homeLabel}</b> till {stores.length} butik{stores.length > 1 ? "er" : ""} och hem
          igen.
          {provider && (
            <span className="ml-1 text-xs text-stone-400">Restider via: {provider}</span>
          )}
        </p>
        <GpsButton className="mt-2" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`pressable rounded-full border px-4 py-2 text-sm font-semibold ${
              mode === m.id
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white hover:bg-stone-50"
            }`}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* When to go */}
      <section className="card p-5">
        <h2 className="font-bold">⏰ När vill du åka?</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setDeparture(null)}
            className={`pressable rounded-xl border px-4 py-2 text-left text-sm ${
              departure === null ? "border-rose-600 bg-rose-50" : "border-stone-200 hover:bg-stone-50"
            }`}
          >
            <span className="font-bold">🚦 Nu direkt</span>
            <br />
            <span style={{ color: tl.color }}>{departure === null ? tl.text : ""}</span>
          </button>
          {suggestions.map((s) => {
            const active = departure?.hour === s.hour && departure?.weekday === s.weekday;
            return (
              <button
                key={`${s.weekday}-${s.hour}`}
                onClick={() => setDeparture({ hour: s.hour, weekday: s.weekday })}
                className={`pressable rounded-xl border px-4 py-2 text-left text-sm ${
                  active ? "border-rose-600 bg-rose-50" : "border-stone-200 hover:bg-stone-50"
                }`}
              >
                <span className="font-bold">💡 {s.label}</span>
                <br />
                <span className="text-stone-500">
                  {Math.round(s.busyness * 100)} % fullt i butik ·{" "}
                  {trafficLabel(s.traffic).text.toLowerCase()}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-stone-500">
          💡 Förslagen väger ihop hur fullt det är i butikerna, trafikläget
          {mode === "car" ? " (viktigt med bil)" : mode === "transit" ? " (påverkar bussen)" : " (spelar ingen roll när du " + (mode === "bike" ? "cyklar" : "går") + ")"}{" "}
          och total restid – idag och imorgon.
        </p>
      </section>

      {/* The plan */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">
            🧭 Din runda {DAY_NAMES[dep.weekday]} kl {String(dep.hour).padStart(2, "0")}:00
          </h2>
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold text-white"
            style={{ background: tl.color }}
          >
            {tl.text}
          </span>
        </div>
        <ol className="mt-4 space-y-2">
          {plan.legs.map((leg, i) => {
            const arriveStore = plan.order[i];
            return (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-900 font-bold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <b>{leg.from}</b> → <b>{leg.to}</b>
                  <span className="text-stone-500">
                    {" "}
                    · {leg.km.toFixed(1)} km · {fmtMinutes(leg.minutes)}
                  </span>
                  {arriveStore && (
                    <span className="block text-xs text-stone-500">
                      🛒 plocka {itemsPerStore.get(arriveStore.id)} varor (~
                      {fmtMinutes(
                        plan.shoppingMinutes / Math.max(plan.order.length, 1)
                      )}{" "}
                      inne i butiken inkl. kö)
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-stone-50 p-4 text-center">
          <div>
            <p className="text-xs text-stone-500">Restid</p>
            <p className="text-lg font-black">{fmtMinutes(plan.travelMinutes)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">I butik (inkl. kö)</p>
            <p className="text-lg font-black">{fmtMinutes(plan.shoppingMinutes)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Totalt hem-till-hem</p>
            <p className="text-lg font-black text-rose-600">{fmtMinutes(plan.totalMinutes)}</p>
          </div>
        </div>
      </section>

      {/* Busyness per store */}
      <section className="card p-5">
        <h2 className="font-bold">📊 Hur fullt är det i butikerna?</h2>
        <p className="mb-4 text-sm text-stone-500">
          Som Googles &quot;populära tider&quot; – stapeln för din valda timme är markerad.
        </p>
        <div className="space-y-5">
          {plan.order.map((s) => (
            <BusyChart key={s.id} store={s} weekday={dep.weekday} highlightHour={dep.hour} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BusyChart({
  store,
  weekday,
  highlightHour,
}: {
  store: Store;
  weekday: number;
  highlightHour: number;
}) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 07–22
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: CHAINS[store.chain].color }}
        />
        {store.name}
      </div>
      <div className="flex h-16 items-end gap-[3px]">
        {hours.map((h) => {
          const v = busynessAt(store, h, weekday);
          const active = h === highlightHour;
          return (
            <div key={h} className="flex flex-1 flex-col items-center gap-0.5">
              <div
                className={`w-full rounded-t ${active ? "bg-rose-600" : "bg-stone-300"}`}
                style={{ height: `${Math.max(v * 56, 2)}px` }}
                title={`${h}:00 – ${Math.round(v * 100)} % fullt`}
              />
              <span className={`text-[9px] ${active ? "font-bold text-rose-600" : "text-stone-400"}`}>
                {h}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
