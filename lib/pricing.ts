import { CatalogueItem, PriceHistory } from "@/lib/types";
import { hash01 } from "@/lib/data/catalogue";

/**
 * Price history for an item: today (the live offer price), one month ago and
 * six months ago.
 *
 * In production this would be backed by a time-series store that snapshots
 * each chain's prices weekly (the app's scraper writes flyer + shelf prices
 * to it). Here we derive a stable, realistic series from the item's ordinary
 * price: grocery inflation means the price six months ago is typically a few
 * percent lower, and a month ago the item usually wasn't on offer.
 */
export function getPriceHistory(item: CatalogueItem): PriceHistory {
  const r1 = hash01(item.id + "-h1"); // month-ago variation
  const r6 = hash01(item.id + "-h6"); // six-months-ago variation

  // A month ago: ordinary price, ±3 %, occasionally a small campaign (-10 %).
  let oneMonthAgo = item.ordinaryPrice * (0.97 + r1 * 0.06);
  if (r1 > 0.85) oneMonthAgo = item.ordinaryPrice * 0.9;

  // Six months ago: 2–7 % cheaper on average (food inflation), some items flat.
  const sixMonthsAgo = item.ordinaryPrice * (0.93 + r6 * 0.06);

  return {
    current: item.price,
    oneMonthAgo: Math.round(oneMonthAgo * 100) / 100,
    sixMonthsAgo: Math.round(sixMonthsAgo * 100) / 100,
  };
}

export function formatSEK(v: number): string {
  return (
    v.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr"
  );
}

export function pctChange(from: number, to: number): number {
  return ((to - from) / from) * 100;
}
