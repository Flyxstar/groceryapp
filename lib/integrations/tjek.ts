/**
 * Live adapter for the Tjek (ShopGun) publication platform that powers
 * ereklamblad.se – the aggregator where the Swedish chains publish their
 * weekly flyers as page images with "hotspots": every offer's polygon
 * position on the page plus name and price.
 *
 * This gives the app the *original* flyer pages rendered in-app, with
 * circle-to-buy hit-testing against real offers.
 *
 * The API key is the public browser key served to every visitor of
 * ereklamblad.se; override with TJEK_API_KEY if you have your own.
 */
import { Chain } from "@/lib/types";

const API = "https://squid-api.tjek.com";
const KEY = process.env.TJEK_API_KEY ?? "152000596c6e45d9983eab0c14afebea";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

/** Which Tjek branding names belong to which of our chains. */
const BRANDING_MATCH: Record<Chain, RegExp> = {
  lidl: /^lidl/i,
  willys: /^willys/i,
  citygross: /^city ?gross/i,
  ica: /^ica/i,
  coop: /coop/i,
  hemkop: /^hemköp/i,
};

export interface RealFlyerOffer {
  /** unique per hotspot (offer can appear on several pages) */
  id: string;
  /** stable offer id, shared across pages */
  offerId: string;
  /** 1-based page number */
  page: number;
  /** polygon, normalized 0..1 page coordinates */
  polygon: [number, number][];
  heading: string;
  price: number;
  prePrice: number | null;
  /** e.g. "500 g" */
  amount?: string;
  comparePrice?: string;
}

export interface RealFlyer {
  catalogId: string;
  chain: Chain;
  name: string;
  label: string;
  runFrom: string;
  runTill: string;
  pageCount: number;
  /** page image URLs, index 0 = page 1 */
  pages: { view: string; zoom: string; thumb: string }[];
  offers: RealFlyerOffer[];
}

async function tjek(path: string, revalidate = 1800): Promise<unknown> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${sep}api_key=${KEY}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Tjek ${path} ${res.status}`);
  return res.json();
}

interface TjekCatalog {
  id: string;
  label: string;
  page_count: number;
  run_from: string;
  run_till: string;
  branding?: { name?: string };
}

interface TjekHotspot {
  type: string;
  locations: Record<string, [number, number][]>;
  offer?: {
    id: string;
    heading: string;
    pricing?: { price?: number; pre_price?: number | null };
    quantity?: {
      unit?: { symbol?: string; si?: { symbol?: string; factor?: number } };
      size?: { from?: number | null; to?: number | null };
    };
  };
}

/** Fetch the current real flyer(s) for a chain near a position. */
export async function fetchRealFlyers(
  chain: Chain,
  lat: number,
  lng: number
): Promise<RealFlyer[]> {
  const catalogs = (await tjek(
    `/v2/catalogs?r_lat=${lat}&r_lng=${lng}&r_radius=70000&limit=100`
  )) as TjekCatalog[];

  const matching = catalogs
    .filter((c) => BRANDING_MATCH[chain].test(c.branding?.name ?? ""))
    // prefer proper multi-page flyers, newest first
    .sort(
      (a, b) =>
        (b.page_count > 2 ? 1 : 0) - (a.page_count > 2 ? 1 : 0) ||
        Date.parse(b.run_from) - Date.parse(a.run_from)
    )
    .slice(0, 2);

  const flyers: RealFlyer[] = [];
  for (const cat of matching) {
    const [pages, hotspots] = await Promise.all([
      tjek(`/v2/catalogs/${cat.id}/pages`) as Promise<
        { view: string; zoom: string; thumb: string }[]
      >,
      tjek(`/v2/catalogs/${cat.id}/hotspots`).catch(() => []) as Promise<TjekHotspot[]>,
    ]);

    const offers: RealFlyerOffer[] = [];
    for (const h of hotspots) {
      if (h.type !== "offer" || !h.offer) continue;
      const price = h.offer.pricing?.price;
      if (!price) continue;
      const q = h.offer.quantity;
      let amount: string | undefined;
      let comparePrice: string | undefined;
      const size = q?.size?.from;
      const sym = q?.unit?.symbol;
      if (size && sym) {
        amount = `${size} ${sym}`;
        const si = q?.unit?.si;
        if (si?.factor && si.symbol && size * si.factor > 0) {
          const per = price / (size * si.factor);
          if (per < 10000) {
            comparePrice = `${per.toFixed(2).replace(".", ",")}/${si.symbol}`;
          }
        }
      }
      for (const [pageKey, polygon] of Object.entries(h.locations ?? {})) {
        offers.push({
          id: `${h.offer.id}-p${pageKey}`,
          offerId: h.offer.id,
          page: Number(pageKey),
          polygon: polygon as [number, number][],
          heading: h.offer.heading,
          price,
          prePrice: h.offer.pricing?.pre_price ?? null,
          amount,
          comparePrice,
        });
      }
    }

    flyers.push({
      catalogId: cat.id,
      chain,
      name: cat.branding?.name ?? chain,
      label: cat.label ?? "",
      runFrom: cat.run_from,
      runTill: cat.run_till,
      pageCount: cat.page_count,
      pages,
      offers,
    });
  }
  return flyers;
}
