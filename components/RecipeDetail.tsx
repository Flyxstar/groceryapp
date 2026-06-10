"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { CHAINS, STORES } from "@/lib/data/stores";
import { formatSEK } from "@/lib/pricing";
import { BrandPreference, StorePlan, planRecipe } from "@/lib/recipe-match";
import { MODES, fmtMinutes, planTrip, trafficLabel, trafficLevel } from "@/lib/travel";
import { Recipe, Store } from "@/lib/types";

const PREFS: { id: BrandPreference; label: string; hint: string }[] = [
  { id: "cheapest", label: "💰 Billigast oavsett", hint: "Tar lägsta priset, märke eller ej" },
  { id: "budget", label: "🏷️ Lågprismärken", hint: "ICA Basic, Eldorado, Garant, Xtra, Favorit…" },
  { id: "brand", label: "⭐ Märkesvaror", hint: "Arla, Scan, Barilla, Kronfågel…" },
];

export default function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const { selectedChains, addToCart, home, mode, hydrated } = useAppState();
  const [pref, setPref] = useState<BrandPreference>("cheapest");
  const [added, setAdded] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const plans = useMemo(
    () => (hydrated ? planRecipe(recipe, selectedChains, pref) : null),
    [recipe, selectedChains, pref, hydrated]
  );

  if (!hydrated || !plans || !now) {
    return <RecipeHero recipe={recipe} />;
  }

  const allPlans: StorePlan[] = [plans.mix, ...plans.perChain];
  const complete = allPlans.filter((p) => p.missing === 0);
  const worst = complete.length ? Math.max(...complete.map((p) => p.total)) : 0;

  const hour = now.getHours();
  const weekday = (now.getDay() + 6) % 7;
  const traffic = trafficLabel(trafficLevel(hour, weekday));
  const modeInfo = MODES.find((m) => m.id === mode)!;

  const addPlan = (plan: StorePlan) => {
    for (const m of plan.matches) {
      if (!m.item) continue;
      for (let i = 0; i < m.count; i++) addToCart(m.item.id, "recipe", recipe.id);
    }
    setAdded(true);
  };

  const tripFor = (plan: StorePlan) => {
    const storeIds = new Set(
      plan.matches.filter((m) => m.item).map((m) => STORES.find((s) => s.chain === m.item!.chain)!.id)
    );
    const stores = STORES.filter((s) => storeIds.has(s.id));
    const itemsPerStore = new Map<string, number>();
    for (const m of plan.matches) {
      if (!m.item) continue;
      const sid = STORES.find((s) => s.chain === m.item!.chain)!.id;
      itemsPerStore.set(sid, (itemsPerStore.get(sid) ?? 0) + m.count);
    }
    return { trip: planTrip(home, stores, itemsPerStore, mode, hour, weekday), stores };
  };

  return (
    <div className="space-y-6">
      <RecipeHero recipe={recipe} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">🧂 Ingredienser ({recipe.servings} port)</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {recipe.ingredients.map((i) => (
              <li key={i.name} className="flex justify-between gap-3">
                <span>
                  {i.name} {i.pantry && <span className="text-xs text-stone-400">(skafferi)</span>}
                </span>
                <span className="text-stone-500">{i.qty}</span>
              </li>
            ))}
          </ul>
          <h2 className="mt-5 font-bold">👨‍🍳 Gör så här</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
            {recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">🏷️ Vilka varor vill du ha?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PREFS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPref(p.id)}
                title={p.hint}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  pref === p.id
                    ? "border-rose-600 bg-rose-50 text-rose-700"
                    : "border-stone-300 hover:bg-stone-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <h2 className="mt-5 font-bold">⚖️ Jämför butiker</h2>
          <p className="text-xs text-stone-500">
            Vad ingredienserna kostar i dina valda butiker – och vad du sparar mot det dyraste
            alternativet.
          </p>
          <div className="mt-3 space-y-2">
            {allPlans.map((plan) => {
              const saving = plan.missing === 0 && worst > 0 ? worst - plan.total : null;
              const { trip } = tripFor(plan);
              return (
                <div
                  key={plan.label}
                  className={`rounded-xl border p-3 ${
                    plan.chain === "mix" ? "border-rose-300 bg-rose-50/50" : "border-stone-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">
                        {plan.chain === "mix" ? "✨ " : ""}
                        {plan.label}
                      </p>
                      <p className="text-xs text-stone-500">
                        {plan.missing > 0
                          ? `${plan.missing} ingrediens(er) saknas i veckans blad`
                          : `${modeInfo.emoji} ~${fmtMinutes(trip.totalMinutes)} hem-till-hem · ${traffic.text.toLowerCase()}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{formatSEK(plan.total)}</p>
                      {saving !== null && saving > 0 && (
                        <p className="text-xs font-bold text-green-600">
                          spara {formatSEK(saving)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => addPlan(plan)}
                      disabled={plan.matches.every((m) => !m.item)}
                      className="rounded-full bg-stone-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-40"
                    >
                      + Lägg i listan
                    </button>
                  </div>
                  {plan.chain === "mix" && (
                    <ul className="mt-2 space-y-1 border-t border-rose-100 pt-2 text-xs text-stone-600">
                      {plan.matches.map((m) => (
                        <li key={m.ingredient.name} className="flex justify-between gap-2">
                          <span>
                            {m.item ? m.item.emoji : "❓"} {m.ingredient.name}
                            {m.count > 1 ? ` ×${m.count}` : ""}
                          </span>
                          {m.item ? (
                            <span>
                              <b style={{ color: CHAINS[m.item.chain].color }}>
                                {CHAINS[m.item.chain].name}
                              </b>{" "}
                              · {m.item.brand} · {formatSEK(m.item.price * m.count)}
                            </span>
                          ) : (
                            <span className="text-stone-400">saknas i veckans blad</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          {added && (
            <div className="pop-in mt-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">
              ✅ Ingredienserna ligger i din inköpslista!{" "}
              <Link href="/cart" className="underline">
                Visa listan
              </Link>{" "}
              ·{" "}
              <Link href="/trip" className="underline">
                planera rundan
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function RecipeHero({ recipe }: { recipe: Recipe }) {
  return (
    <header
      className="relative overflow-hidden rounded-3xl p-8 shadow-lg"
      style={{ background: recipe.gradient }}
    >
      <div className="flex items-center gap-6">
        <span className="text-8xl drop-shadow-xl">{recipe.emoji}</span>
        <div>
          <h1 className="text-3xl font-black text-stone-900">{recipe.name}</h1>
          <p className="mt-1 max-w-xl text-stone-800">{recipe.description}</p>
          <p className="mt-2 text-sm font-semibold text-stone-700">
            ⏱️ {recipe.minutes} min · 🍽️ {recipe.servings} portioner ·{" "}
            {recipe.tags.map((t) => `#${t}`).join(" ")}
          </p>
        </div>
      </div>
    </header>
  );
}
