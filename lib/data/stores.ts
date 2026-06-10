import { Chain, ChainInfo, Store } from "@/lib/types";

/**
 * Budget own-brands per chain:
 * - Eldorado är Axfoods lågprismärke (Willys & Hemköp), Garant deras
 *   ordinarie egna märke (axfood.se/om-axfood/egna-varor/vara-varumarken).
 * - Favorit är City Gross (Bergendahls) eget märke.
 * - Lidl säljer i princip bara egna märken, därför är "märket" här Lidl.
 */
export const CHAINS: Record<Chain, ChainInfo> = {
  lidl: { id: "lidl", name: "Lidl", color: "#0050aa", budgetBrand: "Lidl", logo: "/logos/lidl.png" },
  ica: { id: "ica", name: "ICA", color: "#e3000b", budgetBrand: "ICA Basic", logo: "/logos/ica.png" },
  citygross: { id: "citygross", name: "City Gross", color: "#003da5", budgetBrand: "Favorit", logo: "/logos/citygross.png" },
  willys: { id: "willys", name: "Willys", color: "#e30613", budgetBrand: "Eldorado", logo: "/logos/willys.png" },
  hemkop: { id: "hemkop", name: "Hemköp", color: "#d10a11", budgetBrand: "Eldorado", logo: "/logos/hemkop.svg" },
  coop: { id: "coop", name: "Coop", color: "#00aa46", budgetBrand: "Xtra", logo: "/logos/coop.png" },
};

/**
 * Build a plausible "popular times" matrix (7 days x 24 hours, 0..1).
 * Weekdays peak after work (16–18), weekends peak around lunch (11–14).
 * `shift` lets stores differ a bit from each other.
 */
export function popularTimes(opens: number, closes: number, shift = 0): number[][] {
  const days: number[][] = [];
  for (let d = 0; d < 7; d++) {
    const hours: number[] = [];
    const weekend = d >= 5;
    const peak = (weekend ? 12.5 : 17) + shift;
    const secondary = weekend ? 16 : 11.5; // small lunch bump on weekdays
    for (let h = 0; h < 24; h++) {
      if (h < opens || h >= closes) {
        hours.push(0);
        continue;
      }
      const main = Math.exp(-((h - peak) ** 2) / (weekend ? 7 : 4.5));
      const second = 0.45 * Math.exp(-((h - secondary) ** 2) / 3);
      const base = 0.12;
      hours.push(Math.min(1, base + main * 0.85 + second));
    }
    days.push(hours);
  }
  return days;
}

/**
 * Sample stores around central Stockholm. In a production build these would
 * come from each chain's store-locator API + Google Places.
 */
export const STORES: Store[] = [
  {
    id: "ica-vanadis",
    chain: "ica",
    name: "ICA Supermarket Vanadis",
    address: "Sveavägen 110, Stockholm",
    lat: 59.345,
    lng: 18.052,
    opens: 7,
    closes: 22,
    popularTimes: popularTimes(7, 22, 0),
  },
  {
    id: "lidl-odenplan",
    chain: "lidl",
    name: "Lidl Odenplan",
    address: "Odengatan 65, Stockholm",
    lat: 59.3428,
    lng: 18.0486,
    opens: 8,
    closes: 21,
    popularTimes: popularTimes(8, 21, -0.5),
  },
  {
    id: "willys-fridhemsplan",
    chain: "willys",
    name: "Willys Fridhemsplan",
    address: "S:t Eriksgatan 45, Stockholm",
    lat: 59.3345,
    lng: 18.0292,
    opens: 7,
    closes: 22,
    popularTimes: popularTimes(7, 22, 0.5),
  },
  {
    id: "coop-medborgarplatsen",
    chain: "coop",
    name: "Coop Medborgarplatsen",
    address: "Götgatan 46, Stockholm",
    lat: 59.3146,
    lng: 18.0735,
    opens: 7,
    closes: 23,
    popularTimes: popularTimes(7, 23, 1),
  },
  {
    id: "hemkop-kungsholmen",
    chain: "hemkop",
    name: "Hemköp Kungsholmen",
    address: "Hantverkargatan 32, Stockholm",
    lat: 59.3284,
    lng: 18.0413,
    opens: 7,
    closes: 22,
    popularTimes: popularTimes(7, 22, -1),
  },
  {
    id: "citygross-bromma",
    chain: "citygross",
    name: "City Gross Bromma",
    address: "Ulvsundavägen 185, Bromma",
    lat: 59.3534,
    lng: 17.9622,
    opens: 8,
    closes: 21,
    popularTimes: popularTimes(8, 21, 0.5),
  },
];

export function storeForChain(chain: Chain): Store {
  return STORES.find((s) => s.chain === chain)!;
}
