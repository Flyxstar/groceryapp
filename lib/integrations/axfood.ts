/**
 * Live adapter for the Axfood web platform that powers willys.se and
 * hemkop.se. Both sites expose open JSON endpoints (no API key needed):
 *
 *   GET /axfood/rest/store                          – all stores with geo + hours
 *   GET /search/campaigns/offline?q=<storeId>:relevance&type=PERSONAL_GENERAL
 *                                                   – the week's offers for a store
 *
 * Offers are normalized into the app's CatalogueItem shape so the flyer
 * viewer, cart, price comparison and recipe matching work unchanged.
 */
import { CatalogueItem, Chain } from "@/lib/types";

const BASE: Partial<Record<Chain, string>> = {
  willys: "https://www.willys.se",
  hemkop: "https://www.hemkop.se",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const BUDGET_BRANDS = ["eldorado", "garant", "willys", "hemköp", "minstingen"];

export interface LiveStore {
  id: string;
  chain: Chain;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export function isAxfoodChain(chain: Chain): boolean {
  return chain in BASE;
}

export async function fetchAxfoodStores(chain: Chain): Promise<LiveStore[]> {
  const base = BASE[chain];
  if (!base) throw new Error(`${chain} is not an Axfood chain`);
  const res = await fetch(`${base}/axfood/rest/store`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Axfood stores ${res.status}`);
  const data = (await res.json()) as Array<{
    storeId: string;
    name: string;
    geoPoint?: { latitude: number; longitude: number };
    address?: { line1?: string; town?: string; postalCode?: string };
  }>;
  return data
    .filter((s) => s.geoPoint?.latitude && s.geoPoint?.longitude)
    .map((s) => ({
      id: s.storeId,
      chain,
      name: s.name,
      address: [s.address?.line1, s.address?.town].filter(Boolean).join(", "),
      lat: s.geoPoint!.latitude,
      lng: s.geoPoint!.longitude,
    }));
}

/** "58,90 kr" / "58,90" -> 58.9 */
function parseSek(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = String(s).replace(",", ".").match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}

interface AxfoodOffer {
  name?: string;
  manufacturer?: string;
  price?: string;
  priceNoUnit?: string;
  priceUnit?: string;
  displayVolume?: string;
  image?: { url?: string };
  productBasketType?: { code?: string };
  potentialPromotions?: Array<{
    price?: number | null;
    code?: string;
    mainProductCode?: string;
    comparePrice?: string;
    campaignType?: string;
    description?: string;
    rewardLabel?: string;
    endDate?: string;
    name?: string;
  }>;
}

export async function fetchAxfoodOffers(
  chain: Chain,
  storeId: string
): Promise<{ items: CatalogueItem[]; validUntil?: string }> {
  const base = BASE[chain];
  if (!base) throw new Error(`${chain} is not an Axfood chain`);
  const url =
    `${base}/search/campaigns/offline?q=${encodeURIComponent(storeId + ":relevance")}` +
    `&type=PERSONAL_GENERAL&page=0&size=200`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`Axfood offers ${res.status}`);
  const data = await res.json();
  const results = (data.results ?? []) as AxfoodOffer[];

  const items: CatalogueItem[] = [];
  const seen = new Set<string>();
  let validUntil: string | undefined;

  for (const r of results) {
    const promo = r.potentialPromotions?.[0];
    const offerPrice = promo?.price ?? parseSek(r.priceNoUnit);
    const ordinary = parseSek(r.price) ?? offerPrice;
    const name = promo?.name ?? r.name;
    if (!offerPrice || !name) continue;

    const code = promo?.mainProductCode ?? promo?.code ?? name;
    const id = `${chain}-live-${code}`;
    if (seen.has(id)) continue;
    seen.add(id);
    if (promo?.endDate) validUntil = promo.endDate;

    const brand = r.manufacturer?.trim() || "";
    const nameLower = name.toLowerCase();
    items.push({
      id,
      chain,
      name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      brand: brand.charAt(0) + brand.slice(1).toLowerCase(),
      price: offerPrice,
      ordinaryPrice: Math.max(ordinary ?? offerPrice, offerPrice),
      unit: r.productBasketType?.code === "KG" ? "kg" : "st",
      comparePrice: promo?.comparePrice ?? undefined,
      emoji: "🛒",
      image: r.image?.url,
      category: "skafferi",
      tags: nameLower.split(/[^a-zåäöé]+/).filter((w) => w.length > 2),
      isBudgetBrand: BUDGET_BRANDS.some((b) => brand.toLowerCase().includes(b)),
      memberOffer: promo?.campaignType === "LOYALTY",
    });
  }
  return { items, validUntil };
}
