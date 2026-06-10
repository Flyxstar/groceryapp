"use client";

import Link from "next/link";
import { useState } from "react";
import { RECIPES } from "@/lib/data/recipes";

export default function RecipesPage() {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();
  const recipes = RECIPES.filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.tags.some((t) => t.includes(q)) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(q))
  );

  return (
    <div>
      <h1 className="text-2xl font-black">Recept</h1>
      <p className="mt-1 text-stone-500">
        Hitta något gott – lägg receptet i listan så plockar vi ihop ingredienserna till bästa
        pris från dina butiker.
      </p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Sök recept, ingrediens eller t.ex. ”budget”…"
        className="mt-4 w-full rounded-full border border-white/70 bg-white/75 px-5 py-2.5 shadow-sm outline-none backdrop-blur-xl transition focus:border-rose-400 focus:shadow-md"
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((r) => (
          <Link
            key={r.id}
            href={`/recipes/${r.id}`}
            className="group card card-hover overflow-hidden"
          >
            <div
              className="flex h-40 items-center justify-center text-7xl transition group-hover:scale-110"
              style={{ background: r.gradient }}
            >
              <span className="drop-shadow-lg">{r.emoji}</span>
            </div>
            <div className="p-4">
              <h2 className="font-bold">{r.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-stone-500">{r.description}</p>
              <p className="mt-2 text-xs font-semibold text-stone-400">
                ⏱️ {r.minutes} min · 🍽️ {r.servings} port ·{" "}
                {r.tags
                  .slice(0, 2)
                  .map((t) => `#${t}`)
                  .join(" ")}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {recipes.length === 0 && (
        <p className="mt-10 text-center text-stone-500">Inga recept matchade din sökning.</p>
      )}
    </div>
  );
}
