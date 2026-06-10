import { CataloguePage, CatalogueItem, Category, Chain, PlacedItem } from "@/lib/types";
import { CHAINS } from "@/lib/data/stores";

/** Deterministic tiny hash → 0..1, so prices are stable between runs. */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** Round to typical Swedish shelf prices (x,90 / x,95 / x,50). */
function shelfPrice(p: number): number {
  const base = Math.floor(p);
  const frac = p - base;
  if (frac < 0.25) return Math.max(base - 0.1, 1) + 0; // x.90 of previous
  if (frac < 0.7) return base + 0.5;
  return base + 0.9;
}

interface CanonicalProduct {
  slug: string;
  name: string;
  basePrice: number; // ordinary national-brand price level, SEK
  unit: string;
  emoji: string;
  category: Category;
  tags: string[];
  nationalBrand: string;
  /** if true, every chain sells this as its budget own-brand too */
  budgetVariant?: boolean;
  comparePer?: string; // "kg" | "l" | undefined
}

const PRODUCTS: CanonicalProduct[] = [
  { slug: "kycklingfile", name: "Kycklingfilé", basePrice: 119, unit: "kg", emoji: "🍗", category: "kott-fagel", tags: ["kyckling", "kycklingfilé"], nationalBrand: "Kronfågel", comparePer: "kg" },
  { slug: "blandfars", name: "Blandfärs 50/50", basePrice: 89, unit: "kg", emoji: "🥩", category: "kott-fagel", tags: ["färs", "blandfärs", "köttfärs"], nationalBrand: "Scan", comparePer: "kg" },
  { slug: "laxfile", name: "Laxfilé 4-pack", basePrice: 129, unit: "förp", emoji: "🐟", category: "fisk", tags: ["lax", "laxfilé"], nationalBrand: "Falkenberg", comparePer: "kg" },
  { slug: "falukorv", name: "Falukorv 800 g", basePrice: 42, unit: "st", emoji: "🌭", category: "kott-fagel", tags: ["falukorv", "korv"], nationalBrand: "Scan" },
  { slug: "bacon", name: "Bacon skivat 140 g", basePrice: 25, unit: "förp", emoji: "🥓", category: "kott-fagel", tags: ["bacon"], nationalBrand: "Tulip" },
  { slug: "pasta", name: "Pasta penne 500 g", basePrice: 18, unit: "st", emoji: "🍝", category: "skafferi", tags: ["pasta", "penne", "spaghetti"], nationalBrand: "Barilla", budgetVariant: true },
  { slug: "jasminris", name: "Jasminris 1 kg", basePrice: 32, unit: "st", emoji: "🍚", category: "skafferi", tags: ["ris", "jasminris"], nationalBrand: "Risenta", budgetVariant: true },
  { slug: "krossade-tomater", name: "Krossade tomater 400 g", basePrice: 14, unit: "st", emoji: "🥫", category: "skafferi", tags: ["krossade tomater", "tomatsås"], nationalBrand: "Mutti", budgetVariant: true },
  { slug: "kokosmjolk", name: "Kokosmjölk 400 ml", basePrice: 19, unit: "st", emoji: "🥥", category: "skafferi", tags: ["kokosmjölk"], nationalBrand: "Santa Maria" },
  { slug: "tacoskal", name: "Tortillabröd 8-pack", basePrice: 24, unit: "förp", emoji: "🌮", category: "skafferi", tags: ["tortilla", "taco"], nationalBrand: "Santa Maria" },
  { slug: "gul-lok", name: "Gul lök 1 kg", basePrice: 15, unit: "kg", emoji: "🧅", category: "frukt-gront", tags: ["lök", "gul lök"], nationalBrand: "Svenskt" },
  { slug: "tomater", name: "Tomater kvist", basePrice: 35, unit: "kg", emoji: "🍅", category: "frukt-gront", tags: ["tomat", "tomater"], nationalBrand: "Svenskt", comparePer: "kg" },
  { slug: "gurka", name: "Gurka", basePrice: 16, unit: "st", emoji: "🥒", category: "frukt-gront", tags: ["gurka"], nationalBrand: "Svenskt" },
  { slug: "paprika", name: "Paprika röd", basePrice: 42, unit: "kg", emoji: "🫑", category: "frukt-gront", tags: ["paprika"], nationalBrand: "Spanien", comparePer: "kg" },
  { slug: "potatis", name: "Potatis fast 2 kg", basePrice: 26, unit: "förp", emoji: "🥔", category: "frukt-gront", tags: ["potatis"], nationalBrand: "Svenskt" },
  { slug: "banan", name: "Bananer", basePrice: 22, unit: "kg", emoji: "🍌", category: "frukt-gront", tags: ["banan", "bananer"], nationalBrand: "Chiquita", comparePer: "kg" },
  { slug: "apple", name: "Äpple Royal Gala", basePrice: 29, unit: "kg", emoji: "🍎", category: "frukt-gront", tags: ["äpple"], nationalBrand: "Italien", comparePer: "kg" },
  { slug: "citron", name: "Citron", basePrice: 5, unit: "st", emoji: "🍋", category: "frukt-gront", tags: ["citron"], nationalBrand: "Spanien" },
  { slug: "champinjoner", name: "Champinjoner 250 g", basePrice: 18, unit: "förp", emoji: "🍄", category: "frukt-gront", tags: ["champinjoner", "svamp"], nationalBrand: "Svenskt" },
  { slug: "mjolk", name: "Mellanmjölk 1,5 l", basePrice: 18, unit: "st", emoji: "🥛", category: "mejeri", tags: ["mjölk", "mellanmjölk"], nationalBrand: "Arla", budgetVariant: true },
  { slug: "agg", name: "Ägg 12-pack frigående", basePrice: 39, unit: "förp", emoji: "🥚", category: "mejeri", tags: ["ägg"], nationalBrand: "Kronägg" },
  { slug: "smor", name: "Smör normalsaltat 500 g", basePrice: 62, unit: "st", emoji: "🧈", category: "mejeri", tags: ["smör"], nationalBrand: "Bregott" },
  { slug: "vispgradde", name: "Vispgrädde 5 dl", basePrice: 28, unit: "st", emoji: "🥛", category: "mejeri", tags: ["grädde", "vispgrädde"], nationalBrand: "Arla" },
  { slug: "hushallsost", name: "Hushållsost 1,1 kg", basePrice: 109, unit: "st", emoji: "🧀", category: "mejeri", tags: ["ost", "hushållsost"], nationalBrand: "Arla", budgetVariant: true, comparePer: "kg" },
  { slug: "creme-fraiche", name: "Crème fraiche 34% 2 dl", basePrice: 17, unit: "st", emoji: "🥣", category: "mejeri", tags: ["crème fraiche", "creme fraiche"], nationalBrand: "Arla" },
  { slug: "fetaost", name: "Fetaost 150 g", basePrice: 27, unit: "st", emoji: "🧀", category: "mejeri", tags: ["fetaost", "feta"], nationalBrand: "Apetina" },
  { slug: "brod", name: "Rågbröd skivat 700 g", basePrice: 32, unit: "st", emoji: "🍞", category: "brod", tags: ["bröd", "rågbröd"], nationalBrand: "Pågen" },
  { slug: "kaffe", name: "Bryggkaffe mellanrost 450 g", basePrice: 65, unit: "st", emoji: "☕", category: "dryck", tags: ["kaffe"], nationalBrand: "Zoégas" },
  { slug: "juice", name: "Apelsinjuice 1,75 l", basePrice: 32, unit: "st", emoji: "🧃", category: "dryck", tags: ["juice", "apelsinjuice"], nationalBrand: "Bravo" },
  { slug: "frysta-gronsaker", name: "Grönsaksblandning fryst 1 kg", basePrice: 26, unit: "st", emoji: "🥦", category: "fryst", tags: ["frysta grönsaker", "grönsaksblandning"], nationalBrand: "Findus", budgetVariant: true },
  { slug: "glass", name: "Glass 0,5 l", basePrice: 45, unit: "st", emoji: "🍨", category: "fryst", tags: ["glass"], nationalBrand: "GB Glace" },
  { slug: "godis", name: "Lösgodis", basePrice: 119, unit: "kg", emoji: "🍬", category: "godis-snacks", tags: ["godis", "lösgodis"], nationalBrand: "Karamellkungen", comparePer: "kg" },
  { slug: "chips", name: "Chips sourcream 275 g", basePrice: 32, unit: "st", emoji: "🥔", category: "godis-snacks", tags: ["chips"], nationalBrand: "OLW" },
  { slug: "toapapper", name: "Toalettpapper 16-pack", basePrice: 79, unit: "förp", emoji: "🧻", category: "hushall", tags: ["toalettpapper"], nationalBrand: "Lambi", budgetVariant: true },
];

/** Per-chain ordinary price level vs the canonical base. */
const CHAIN_FACTOR: Record<Chain, number> = {
  lidl: 0.9,
  willys: 0.92,
  citygross: 0.96,
  coop: 1.02,
  ica: 1.05,
  hemkop: 1.08,
};

/** How deep this week's flyer discounts go per chain. */
const OFFER_DEPTH: Record<Chain, number> = {
  lidl: 0.8,
  willys: 0.82,
  citygross: 0.8,
  coop: 0.85,
  ica: 0.84,
  hemkop: 0.86,
};

/** Budget own-brand price vs national brand in the same chain. */
const BUDGET_FACTOR = 0.68;

/** Which canonical products each chain has on offer this week (subset + order = flyer order). */
const CHAIN_ASSORTMENT: Record<Chain, string[]> = {
  ica: ["kycklingfile", "blandfars", "laxfile", "pasta", "krossade-tomater", "jasminris", "gul-lok", "tomater", "gurka", "paprika", "potatis", "mjolk", "agg", "hushallsost", "vispgradde", "creme-fraiche", "smor", "brod", "banan", "apple", "kaffe", "frysta-gronsaker", "godis", "toapapper"],
  lidl: ["kycklingfile", "blandfars", "laxfile", "pasta", "krossade-tomater", "jasminris", "gul-lok", "tomater", "gurka", "potatis", "mjolk", "agg", "hushallsost", "vispgradde", "fetaost", "brod", "banan", "citron", "kaffe", "frysta-gronsaker", "chips", "toapapper"],
  willys: ["kycklingfile", "blandfars", "laxfile", "falukorv", "pasta", "krossade-tomater", "jasminris", "tacoskal", "gul-lok", "tomater", "gurka", "paprika", "potatis", "mjolk", "agg", "hushallsost", "vispgradde", "smor", "brod", "banan", "juice", "frysta-gronsaker", "glass", "toapapper"],
  citygross: ["kycklingfile", "blandfars", "laxfile", "falukorv", "bacon", "pasta", "krossade-tomater", "jasminris", "kokosmjolk", "gul-lok", "tomater", "gurka", "paprika", "potatis", "mjolk", "agg", "hushallsost", "creme-fraiche", "brod", "apple", "kaffe", "godis", "toapapper"],
  hemkop: ["kycklingfile", "blandfars", "laxfile", "bacon", "pasta", "krossade-tomater", "gul-lok", "tomater", "gurka", "champinjoner", "potatis", "mjolk", "agg", "hushallsost", "vispgradde", "fetaost", "smor", "brod", "banan", "apple", "juice", "glass"],
  coop: ["kycklingfile", "blandfars", "laxfile", "falukorv", "pasta", "krossade-tomater", "jasminris", "kokosmjolk", "gul-lok", "tomater", "gurka", "paprika", "potatis", "mjolk", "agg", "hushallsost", "vispgradde", "creme-fraiche", "brod", "banan", "citron", "kaffe", "chips", "toapapper"],
};

function buildItem(chain: Chain, p: CanonicalProduct, budget: boolean): CatalogueItem {
  const id = `${chain}-${p.slug}${budget ? "-budget" : ""}`;
  const jitter = 0.96 + hash01(id) * 0.08; // ±4 % per store
  const ordinary = shelfPrice(p.basePrice * CHAIN_FACTOR[chain] * (budget ? BUDGET_FACTOR : 1) * jitter);
  const depth = OFFER_DEPTH[chain] + hash01(id + "d") * 0.08;
  const price = shelfPrice(ordinary * depth);
  const brand = budget ? CHAINS[chain].budgetBrand : p.nationalBrand;
  return {
    id,
    chain,
    name: p.name,
    brand,
    price,
    ordinaryPrice: ordinary,
    unit: p.unit,
    comparePrice: p.comparePer ? `${price.toFixed(2).replace(".", ",")}/${p.comparePer}` : undefined,
    emoji: p.emoji,
    category: p.category,
    tags: p.tags,
    isBudgetBrand: budget,
    memberOffer: hash01(id + "m") > 0.7,
  };
}

function buildChainItems(chain: Chain): CatalogueItem[] {
  const items: CatalogueItem[] = [];
  for (const slug of CHAIN_ASSORTMENT[chain]) {
    const p = PRODUCTS.find((x) => x.slug === slug)!;
    items.push(buildItem(chain, p, false));
    if (p.budgetVariant) items.push(buildItem(chain, p, true));
  }
  return items;
}

const PAGE_TITLES = ["Veckans klipp", "Färskvaror", "Skafferi & mejeri", "Hushåll, snacks & mer"];

/** Lay items out on flyer pages: first page = splash layout, rest = 2x4 grids.
 *  Also used to typeset live offers fetched from the chains' APIs. */
export function layoutPages(chain: Chain, items: CatalogueItem[]): CataloguePage[] {
  const pages: CataloguePage[] = [];
  let rest = [...items];
  let pageNo = 1;

  // Page 1: one big splash + 4 small
  const splashItems = rest.slice(0, 5);
  rest = rest.slice(5);
  const placed: PlacedItem[] = [
    { item: splashItems[0], x: 6, y: 12, w: 88, h: 34, splash: true },
    { item: splashItems[1], x: 6, y: 50, w: 42, h: 22 },
    { item: splashItems[2], x: 52, y: 50, w: 42, h: 22 },
    { item: splashItems[3], x: 6, y: 75, w: 42, h: 22 },
    { item: splashItems[4], x: 52, y: 75, w: 42, h: 22 },
  ].filter((p) => p.item);
  pages.push({ id: `${chain}-p1`, chain, pageNumber: pageNo++, title: PAGE_TITLES[0], items: placed });

  // Remaining pages: 2 cols x 4 rows = 8 items
  while (rest.length > 0) {
    const chunk = rest.slice(0, 8);
    rest = rest.slice(8);
    const placedChunk: PlacedItem[] = chunk.map((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      return { item, x: 6 + col * 46, y: 12 + row * 21.5, w: 42, h: 19.5 };
    });
    pages.push({
      id: `${chain}-p${pageNo}`,
      chain,
      pageNumber: pageNo,
      title: PAGE_TITLES[Math.min(pageNo - 1, PAGE_TITLES.length - 1)],
      items: placedChunk,
    });
    pageNo++;
  }
  return pages;
}

const ALL_ITEMS = new Map<string, CatalogueItem>();
const CATALOGUES: Record<Chain, CataloguePage[]> = {} as Record<Chain, CataloguePage[]>;

for (const chain of Object.keys(CHAINS) as Chain[]) {
  const items = buildChainItems(chain);
  for (const it of items) ALL_ITEMS.set(it.id, it);
  CATALOGUES[chain] = layoutPages(chain, items);
}

export function getCatalogue(chain: Chain): CataloguePage[] {
  return CATALOGUES[chain];
}

export function getItem(id: string): CatalogueItem | undefined {
  return ALL_ITEMS.get(id);
}

export function allItems(): CatalogueItem[] {
  return [...ALL_ITEMS.values()];
}

/** ISO week number, for the "vecka XX" flyer header. */
export function currentWeek(d = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
