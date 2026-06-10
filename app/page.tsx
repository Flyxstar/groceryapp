"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { currentWeek } from "@/lib/data/catalogue";
import { CHAINS, STORES } from "@/lib/data/stores";
import { PRESET_HOMES, roadKm } from "@/lib/geo";
import { MODES, busynessAt, trafficLabel, trafficLevel } from "@/lib/travel";
import { Chain } from "@/lib/types";

/** iOS grouped-table section header. */
function SectionHeader({ children, trailing }: { children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-end justify-between px-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-stone-500">
        {children}
      </h2>
      {trailing}
    </div>
  );
}

export default function Home() {
  const {
    home,
    homeLabel,
    setHome,
    selectedChains,
    toggleChain,
    mode,
    setMode,
    cart,
    hydrated,
  } = useAppState();
  // clock-dependent content renders after mount so SSR and client agree
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const hour = now?.getHours() ?? 12;
  const weekday = now ? (now.getDay() + 6) % 7 : 2;
  const tl = trafficLabel(trafficLevel(hour, weekday));
  const greeting = hour < 10 ? "God morgon" : hour < 18 ? "God eftermiddag" : "God kväll";
  const dateStr = now?.toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const myStores = STORES.filter((s) => !hydrated || selectedChains.includes(s.chain)).sort(
    (a, b) => roadKm(home, a) - roadKm(home, b)
  );

  const locate = () =>
    navigator.geolocation?.getCurrentPosition((pos) =>
      setHome({ lat: pos.coords.latitude, lng: pos.coords.longitude }, "Min position")
    );

  return (
    <div className="space-y-8">
      {/* Large Title — the statement and the whisper */}
      <header className="px-1">
        {dateStr && (
          <p className="text-[13px] font-semibold uppercase tracking-wide text-stone-500">
            {dateStr}
          </p>
        )}
        <h1 className="mt-0.5 text-4xl font-black tracking-tight">Idag</h1>
        {now && (
          <p className="mt-1 font-light text-stone-500">
            {greeting} – veckans blad väntar på din penna.
          </p>
        )}
      </header>

      {/* Featured card (App Store "Today" pattern) */}
      <Link href="/catalogues" className="card card-hover pressable block overflow-hidden">
        <div
          className="p-6 text-white sm:p-8"
          style={{ background: "linear-gradient(125deg,#be123c 0%,#e11d48 45%,#f97316 100%)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-rose-100/80">
            Vecka {currentWeek()} · ✏️ ringa in
          </p>
          <h2 className="mt-1 text-2xl font-black sm:text-3xl">Veckans reklamblad är här</h2>
          <p className="mt-1 max-w-md font-light text-rose-50/90">
            Originalbladen, direkt i appen. Ringa det du vill ha – listan bygger sig själv.
          </p>
        </div>
        <div className="flex min-h-[44px] items-center justify-between gap-3 px-5 py-3">
          <span className="truncate text-sm text-stone-500">
            Lidl · ICA · City Gross · Willys · Hemköp · Coop
          </span>
          <span className="rounded-full bg-rose-600 px-4 py-1.5 text-sm font-bold text-white">
            Öppna
          </span>
        </div>
      </Link>

      {/* Läget just nu */}
      <section>
        <SectionHeader
          trailing={
            now && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                style={{ background: tl.color }}
              >
                {tl.text}
              </span>
            )
          }
        >
          Läget just nu
        </SectionHeader>
        <div className="card divide-y divide-stone-100 overflow-hidden">
          {myStores.map((s) => {
            const busy = now ? busynessAt(s, hour, weekday) : 0;
            const open = hour >= s.opens && hour < s.closes;
            return (
              <div key={s.id} className="flex min-h-[44px] items-center gap-3 px-4 py-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: CHAINS[s.chain].color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs font-light text-stone-500">
                    {roadKm(home, s).toFixed(1)} km ·{" "}
                    {now
                      ? open
                        ? busy < 0.35
                          ? "lugnt just nu"
                          : busy < 0.65
                            ? "ganska många inne"
                            : "fullt ös"
                        : `öppnar ${s.opens}:00`
                      : "…"}
                  </p>
                </div>
                <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(busy * 100)}%`,
                      background: busy < 0.35 ? "#16a34a" : busy < 0.65 ? "#d97706" : "#dc2626",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Min position */}
      <section>
        <SectionHeader>Min position</SectionHeader>
        <div className="card divide-y divide-stone-100 overflow-hidden">
          {PRESET_HOMES.map((p) => {
            const selected = hydrated && homeLabel === p.label;
            return (
              <button
                key={p.label}
                onClick={() => setHome(p.pos, p.label)}
                aria-pressed={selected}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-stone-50"
              >
                <span>{p.label}</span>
                {selected && <span className="font-bold text-rose-600">✓</span>}
              </button>
            );
          })}
          <button
            onClick={locate}
            aria-pressed={hydrated && homeLabel === "Min position"}
            className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-stone-50"
          >
            <span>🛰️ Använd min GPS-position</span>
            {hydrated && homeLabel === "Min position" && (
              <span className="font-bold text-rose-600">✓</span>
            )}
          </button>
        </div>
        <p className="mt-2 px-4 text-xs font-light text-stone-500">
          Styr butikssortering, närmaste butik och restider.
        </p>
      </section>

      {/* Dina butiker */}
      <section>
        <SectionHeader>Dina butiker</SectionHeader>
        <div className="card divide-y divide-stone-100 overflow-hidden">
          {(Object.keys(CHAINS) as Chain[]).map((c) => {
            const on = !hydrated || selectedChains.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleChain(c)}
                role="switch"
                aria-checked={on}
                className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-stone-50"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: CHAINS[c].color }}
                />
                <span className="flex-1 text-sm font-semibold">{CHAINS[c].name}</span>
                <span className="ios-switch" data-on={on} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Färdsätt */}
      <section>
        <SectionHeader>Färdsätt</SectionHeader>
        <div className="card p-2">
          <div className="segmented" role="radiogroup" aria-label="Färdsätt">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                aria-pressed={hydrated && mode === m.id}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA when a list exists */}
      {hydrated && cart.length > 0 && (
        <Link
          href="/trip"
          className="pressable block min-h-[50px] rounded-2xl bg-rose-600 px-6 py-3.5 text-center font-bold text-white shadow-lg hover:bg-rose-500"
        >
          🗺️ Planera rundan – {cart.reduce((a, l) => a + l.qty, 0)} varor i listan
        </Link>
      )}
    </div>
  );
}
