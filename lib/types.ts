export type Chain = "lidl" | "ica" | "citygross" | "willys" | "hemkop" | "coop";

export interface ChainInfo {
  id: Chain;
  name: string;
  color: string; // brand-ish color for flyer headers
  budgetBrand: string; // the chain's low-price own brand
}

export interface Store {
  id: string;
  chain: Chain;
  name: string;
  address: string;
  lat: number;
  lng: number;
  opens: number; // hour, e.g. 8
  closes: number; // hour, e.g. 21
  /** Relative busyness 0..1 per hour (index 0-23) per weekday (0=Mon..6=Sun) */
  popularTimes: number[][];
}

export type Category =
  | "frukt-gront"
  | "kott-fagel"
  | "fisk"
  | "mejeri"
  | "skafferi"
  | "brod"
  | "dryck"
  | "fryst"
  | "godis-snacks"
  | "hushall";

export interface CatalogueItem {
  id: string;
  chain: Chain;
  name: string;
  brand: string;
  /** Current weekly offer price in SEK */
  price: number;
  /** Ordinary (non-offer) price in SEK, used as price-history baseline */
  ordinaryPrice: number;
  unit: string; // "st", "kg", "förp", ...
  comparePrice?: string; // e.g. "39,90/kg"
  emoji: string;
  /** real product photo (live offers); emoji is the fallback */
  image?: string;
  category: Category;
  /** Tags used to match recipe ingredients, e.g. ["pasta"], ["kycklingfilé", "kyckling"] */
  tags: string[];
  /** True for the chain's own budget brand (ICA Basic, Eldorado, Garant, Xtra...) */
  isBudgetBrand?: boolean;
  memberOffer?: boolean;
}

/** An item placed on a flyer page with position (percentages of page size). */
export interface PlacedItem {
  item: CatalogueItem;
  x: number;
  y: number;
  w: number;
  h: number;
  splash?: boolean; // big "veckans klipp" placement
}

export interface CataloguePage {
  id: string;
  chain: Chain;
  pageNumber: number;
  title: string;
  items: PlacedItem[];
}

export interface CartLine {
  itemId: string;
  qty: number;
  /** Where the item came from: circled in a catalogue, or added via a recipe */
  source: "catalogue" | "recipe";
  recipeId?: string;
}

export type TransportMode = "car" | "bike" | "walk" | "transit";

export interface Ingredient {
  name: string;
  qty: string;
  /** tags to match against CatalogueItem.tags; first match wins */
  match: string[];
  /** items per ingredient needed (usually 1) */
  count?: number;
  pantry?: boolean; // salt, oil etc – assumed at home, not shopped
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  emoji: string;
  /** css gradient used as the "beautiful image" backdrop */
  gradient: string;
  servings: number;
  minutes: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: string[];
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PriceHistory {
  current: number;
  oneMonthAgo: number;
  sixMonthsAgo: number;
}
