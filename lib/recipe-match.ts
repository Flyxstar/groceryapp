import { CatalogueItem, Chain, Ingredient, Recipe } from "@/lib/types";
import { allItems } from "@/lib/data/catalogue";
import { CHAINS } from "@/lib/data/stores";

export type BrandPreference = "cheapest" | "budget" | "brand";

export interface IngredientMatch {
  ingredient: Ingredient;
  item: CatalogueItem | null; // null = pantry or not available
  count: number;
}

export interface StorePlan {
  chain: Chain | "mix";
  label: string;
  matches: IngredientMatch[];
  total: number;
  missing: number; // shoppable ingredients with no match at this chain
}

function candidatesFor(ing: Ingredient, chains: Chain[], pref: BrandPreference): CatalogueItem[] {
  const all = allItems().filter(
    (item) =>
      chains.includes(item.chain) &&
      ing.match.some((tag) => item.tags.includes(tag.toLowerCase()))
  );
  if (pref === "budget") {
    // prefer the chain's own budget brand when one exists for this product
    const budget = all.filter((i) => i.isBudgetBrand);
    if (budget.length) return budget;
  }
  if (pref === "brand") {
    const branded = all.filter((i) => !i.isBudgetBrand);
    if (branded.length) return branded;
  }
  return all;
}

function bestAt(ing: Ingredient, chains: Chain[], pref: BrandPreference): CatalogueItem | null {
  const c = candidatesFor(ing, chains, pref);
  if (!c.length) return null;
  return c.reduce((a, b) => (a.price <= b.price ? a : b));
}

/**
 * Price a recipe at a single chain, and as the optimal mix across all the
 * user's selected chains ("mix" = cheapest store per ingredient).
 */
export function planRecipe(
  recipe: Recipe,
  selectedChains: Chain[],
  pref: BrandPreference
): { mix: StorePlan; perChain: StorePlan[] } {
  const shoppable = recipe.ingredients.filter((i) => !i.pantry && i.match.length > 0);

  const buildPlan = (chains: Chain[], label: string, id: Chain | "mix"): StorePlan => {
    const matches: IngredientMatch[] = shoppable.map((ing) => ({
      ingredient: ing,
      item: bestAt(ing, chains, pref),
      count: ing.count ?? 1,
    }));
    return {
      chain: id,
      label,
      matches,
      total: matches.reduce((acc, m) => acc + (m.item ? m.item.price * m.count : 0), 0),
      missing: matches.filter((m) => !m.item).length,
    };
  };

  const mix = buildPlan(selectedChains, "Bästa mix (billigast per vara)", "mix");
  const perChain = selectedChains
    .map((c) => buildPlan([c], CHAINS[c].name, c))
    .sort((a, b) => a.missing - b.missing || a.total - b.total);

  return { mix, perChain };
}
