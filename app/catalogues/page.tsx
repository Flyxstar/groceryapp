"use client";

import Link from "next/link";
import GpsButton from "@/components/GpsButton";
import { useAppState } from "@/lib/app-state";
import { CHAINS, STORES } from "@/lib/data/stores";
import { currentWeek, getCatalogue } from "@/lib/data/catalogue";
import { roadKm } from "@/lib/geo";
import { Chain } from "@/lib/types";

export default function CataloguesPage() {
  const { selectedChains, home, hydrated } = useAppState();
  const week = currentWeek();
  const chains = (Object.keys(CHAINS) as Chain[]).filter(
    (c) => !hydrated || selectedChains.includes(c)
  );

  return (
    <div>
      <h1 className="text-2xl font-black">Veckans reklamblad · vecka {week}</h1>
      <p className="mt-1 text-stone-500">
        Öppna ett blad, och ringa in det du vill ha med fingret eller musen – varorna hamnar
        direkt i din inköpslista.
      </p>
      <div className="mb-6 mt-3">
        <GpsButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {chains.map((c) => {
          const store = STORES.find((s) => s.chain === c)!;
          const pages = getCatalogue(c);
          const itemCount = pages.reduce((a, p) => a + p.items.length, 0);
          return (
            <Link
              key={c}
              href={`/catalogues/${c}`}
              className="group card card-hover overflow-hidden"
            >
              <div
                className="flex h-28 items-center justify-center text-3xl font-black text-white"
                style={{ background: CHAINS[c].color }}
              >
                {CHAINS[c].name}
              </div>
              <div className="p-4">
                <p className="font-semibold">Vecka {week} · {pages.length} sidor</p>
                <p className="text-sm text-stone-500">
                  {itemCount} erbjudanden · {store.name}
                </p>
                <p className="text-sm text-stone-500">
                  {roadKm(home, store).toFixed(1)} km från dig
                </p>
                <p className="mt-2 text-sm font-semibold text-rose-600 group-hover:underline">
                  Bläddra & ringa in →
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
