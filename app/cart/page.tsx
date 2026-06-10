"use client";

import Link from "next/link";
import { useAppState } from "@/lib/app-state";
import { CHAINS } from "@/lib/data/stores";
import { roadKm } from "@/lib/geo";
import { formatSEK, getPriceHistory, pctChange } from "@/lib/pricing";
import { CartLine, CatalogueItem, Store } from "@/lib/types";

interface StoreGroup {
  store: Store;
  km: number;
  lines: { line: CartLine; item: CatalogueItem }[];
  subtotal: number;
}

export default function CartPage() {
  const { cart, setQty, removeFromCart, clearCart, home, hydrated, resolveItem, storeFor } =
    useAppState();

  if (!hydrated) return null;

  const groups: StoreGroup[] = [];
  for (const line of cart) {
    const item = resolveItem(line.itemId);
    if (!item) continue;
    const store = storeFor(item.chain);
    let g = groups.find((x) => x.store.id === store.id);
    if (!g) {
      g = { store, km: roadKm(home, store), lines: [], subtotal: 0 };
      groups.push(g);
    }
    g.lines.push({ line, item });
    g.subtotal += item.price * line.qty;
  }
  // closest store first – that's the order you'll shop in
  groups.sort((a, b) => a.km - b.km);
  const grandTotal = groups.reduce((a, g) => a + g.subtotal, 0);
  const ordinaryTotal = groups.reduce(
    (a, g) => a + g.lines.reduce((x, l) => x + l.item.ordinaryPrice * l.line.qty, 0),
    0
  );

  if (groups.length === 0) {
    return (
      <div className="card border-dashed p-12 text-center">
        <p className="text-5xl">🛒</p>
        <h1 className="mt-3 text-xl font-bold">Din inköpslista är tom</h1>
        <p className="mt-1 text-stone-500">
          Ringa in varor i reklambladen eller lägg till ett recept så dyker de upp här.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/catalogues" className="rounded-full bg-rose-600 px-5 py-2 font-bold text-white">
            📰 Till reklambladen
          </Link>
          <Link href="/recipes" className="rounded-full bg-stone-900 px-5 py-2 font-bold text-white">
            🍳 Till recepten
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Din inköpslista</h1>
          <p className="text-stone-500">
            Sorterad efter närmaste butik först – handla i den här ordningen.
          </p>
        </div>
        <button
          onClick={clearCart}
          className="rounded-full border border-stone-300 px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
        >
          Töm listan
        </button>
      </div>

      <div className="space-y-6">
        {groups.map((g, idx) => (
          <section
            key={g.store.id}
            className="card overflow-hidden"
          >
            <header
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-white"
              style={{ background: CHAINS[g.store.chain].color }}
            >
              <div>
                <span className="mr-2 rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">
                  Stopp {idx + 1}
                </span>
                <span className="font-black">{g.store.name}</span>
              </div>
              <span className="text-sm font-semibold">
                {g.km.toFixed(1)} km · {g.lines.length} varor · {formatSEK(g.subtotal)}
              </span>
            </header>
            <ul className="divide-y divide-stone-100">
              {g.lines.map(({ line, item }) => {
                const hist = getPriceHistory(item);
                const vs6 = pctChange(hist.sixMonthsAgo, hist.current);
                return (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-8 w-8 object-contain" />
                    ) : (
                      <span className="text-2xl">{item.emoji}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {item.name}{" "}
                        <span className="text-sm font-normal text-stone-500">{item.brand}</span>
                        {line.source === "recipe" && (
                          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            recept
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500">
                        Idag <b>{formatSEK(hist.current)}</b> · för 1 mån sen{" "}
                        {formatSEK(hist.oneMonthAgo)} · för 6 mån sen {formatSEK(hist.sixMonthsAgo)}{" "}
                        <span className={vs6 <= 0 ? "text-green-600" : "text-rose-600"}>
                          ({vs6 > 0 ? "+" : ""}
                          {vs6.toFixed(0)} % på 6 mån)
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQty(item.id, line.qty - 1)}
                        aria-label={`Minska antal ${item.name}`}
                        className="pressable hit-target h-7 w-7 rounded-full border border-stone-300 font-bold hover:bg-stone-100"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-bold">{line.qty}</span>
                      <button
                        onClick={() => setQty(item.id, line.qty + 1)}
                        aria-label={`Öka antal ${item.name}`}
                        className="pressable hit-target h-7 w-7 rounded-full border border-stone-300 font-bold hover:bg-stone-100"
                      >
                        +
                      </button>
                    </div>
                    <div className="tnum w-24 text-right font-bold">
                      {formatSEK(item.price * line.qty)}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="hit-target text-stone-400 hover:text-rose-600"
                      aria-label="Ta bort"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
            <footer className="flex justify-between bg-stone-50 px-5 py-2 text-sm font-bold">
              <span>Summa {CHAINS[g.store.chain].name}</span>
              <span>{formatSEK(g.subtotal)}</span>
            </footer>
          </section>
        ))}
      </div>

      <div className="mt-6 glass-dark rounded-2xl p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-stone-300">
              Totalt {cart.reduce((a, l) => a + l.qty, 0)} varor i {groups.length} butiker
            </p>
            <p className="tnum text-3xl font-black">{formatSEK(grandTotal)}</p>
            <p className="text-sm text-green-400">
              Du sparar {formatSEK(ordinaryTotal - grandTotal)} mot ordinarie priser 🎉
            </p>
          </div>
          <Link
            href="/trip"
            className="pressable rounded-full bg-rose-600 px-6 py-3 font-bold text-white hover:bg-rose-500"
          >
            🗺️ Planera rundan & bästa tid →
          </Link>
        </div>
      </div>
    </div>
  );
}
