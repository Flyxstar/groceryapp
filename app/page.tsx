"use client";

import Link from "next/link";
import { useAppState } from "@/lib/app-state";
import { CHAINS, STORES } from "@/lib/data/stores";
import { PRESET_HOMES, roadKm } from "@/lib/geo";
import { MODES, busynessAt, trafficLabel, trafficLevel } from "@/lib/travel";
import { Chain } from "@/lib/types";

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

  const now = new Date();
  const hour = now.getHours();
  const weekday = (now.getDay() + 6) % 7;
  const traffic = trafficLevel(hour, weekday);
  const tl = trafficLabel(traffic);

  const myStores = STORES.filter((s) => selectedChains.includes(s.chain)).sort(
    (a, b) => roadKm(home, a) - roadKm(home, b)
  );

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl p-8 text-white shadow-[0_24px_60px_-20px_rgba(225,29,72,0.5)]" style={{ background: "linear-gradient(125deg,#be123c 0%,#e11d48 35%,#f97316 100%)" }}>
        <h1 className="text-3xl font-black sm:text-4xl">
          Ringa in veckans klipp ✏️
        </h1>
        <p className="mt-2 max-w-2xl text-rose-50">
          Bläddra i veckans reklamblad från dina butiker, ringa in varorna precis som i en
          leksakskatalog – och få en färdig inköpslista med priser, prisrekord och den smartaste
          tiden att åka.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/catalogues"
            className="pressable rounded-full bg-white px-5 py-2 font-bold text-rose-600 shadow hover:bg-rose-50"
          >
            📰 Öppna reklambladen
          </Link>
          <Link
            href="/recipes"
            className="pressable rounded-full bg-rose-700/60 px-5 py-2 font-bold text-white hover:bg-rose-700"
          >
            🍳 Hitta recept
          </Link>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">📍 Var bor du?</h2>
          <p className="mb-3 text-sm text-stone-500">
            Används för att sortera butiker efter avstånd och räkna ut restider.
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_HOMES.map((p) => (
              <button
                key={p.label}
                onClick={() => setHome(p.pos, p.label)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  hydrated && homeLabel === p.label
                    ? "border-rose-600 bg-rose-50 font-semibold text-rose-700"
                    : "border-stone-300 hover:bg-stone-50"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() =>
                navigator.geolocation?.getCurrentPosition((pos) =>
                  setHome(
                    { lat: pos.coords.latitude, lng: pos.coords.longitude },
                    "Min position"
                  )
                )
              }
              className={`rounded-full border px-3 py-1.5 text-sm ${
                hydrated && homeLabel === "Min position"
                  ? "border-rose-600 bg-rose-50 font-semibold text-rose-700"
                  : "border-stone-300 hover:bg-stone-50"
              }`}
            >
              🛰️ Använd min position
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold">🏪 Dina butiker</h2>
          <p className="mb-3 text-sm text-stone-500">
            Välj vilka kedjor du vill se reklamblad och priser från.
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CHAINS) as Chain[]).map((c) => {
              const on = !hydrated || selectedChains.includes(c);
              return (
                <button
                  key={c}
                  aria-pressed={!hydrated || selectedChains.includes(c)}
                  onClick={() => toggleChain(c)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    on ? "text-white" : "border-stone-300 text-stone-400 hover:bg-stone-50"
                  }`}
                  style={on ? { background: CHAINS[c].color, borderColor: CHAINS[c].color } : {}}
                >
                  {CHAINS[c].name}
                </button>
              );
            })}
          </div>
          <h3 className="mt-4 font-bold">🚗 Färdsätt</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                aria-pressed={hydrated && mode === m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  hydrated && mode === m.id
                    ? "border-stone-900 bg-stone-900 font-semibold text-white"
                    : "border-stone-300 hover:bg-stone-50"
                }`}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Läget just nu</h2>
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold text-white"
            style={{ background: tl.color }}
          >
            {tl.text}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {myStores.map((s) => {
            const busy = busynessAt(s, hour, weekday);
            const open = hour >= s.opens && hour < s.closes;
            return (
              <div key={s.id} className="rounded-xl border border-stone-100 bg-stone-50 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: CHAINS[s.chain].color }}
                  />
                  <span className="text-sm font-semibold">{s.name}</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {roadKm(home, s).toFixed(1)} km bort ·{" "}
                  {open ? `öppet till ${s.closes}:00` : `öppnar ${s.opens}:00`}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(busy * 100)}%`,
                      background: busy < 0.35 ? "#16a34a" : busy < 0.65 ? "#d97706" : "#dc2626",
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {open
                    ? busy < 0.35
                      ? "Lugnt i butiken just nu"
                      : busy < 0.65
                        ? "Ganska många besökare nu"
                        : "Fullt ös i butiken nu"
                    : "Stängt just nu"}
                </p>
              </div>
            );
          })}
        </div>
        {hydrated && cart.length > 0 && (
          <Link
            href="/trip"
            className="mt-4 inline-block rounded-full bg-stone-900 px-5 py-2 font-bold text-white hover:bg-stone-700"
          >
            🗺️ Planera bästa tiden för din runda →
          </Link>
        )}
      </section>
    </div>
  );
}
