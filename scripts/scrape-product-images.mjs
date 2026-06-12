/**
 * Scrapes real product photos from the Axfood image CDN (the same photos
 * willys.se and hemkop.se show in their weekly offers) and matches them to
 * the app's canonical products by keyword. Writes lib/data/product-images.ts.
 *
 * Re-run whenever you want fresher images:  node scripts/scrape-product-images.mjs
 */
import { writeFileSync } from "node:fs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

// canonical slug -> keywords that must appear in the offer name (lowercase)
const WANTED = {
  kycklingfile: ["kycklingfilé", "kycklingbröstfilé", "kyckling"],
  blandfars: ["blandfärs", "nötfärs", "köttfärs"],
  laxfile: ["laxfilé", "lax"],
  falukorv: ["falukorv"],
  bacon: ["bacon"],
  pasta: ["pasta", "penne", "spaghetti", "makaroner"],
  jasminris: ["jasminris", "ris "],
  "krossade-tomater": ["krossade tomater"],
  kokosmjolk: ["kokosmjölk"],
  tacoskal: ["tortilla", "tacoskal"],
  "gul-lok": ["gul lök", "lök i nät"],
  tomater: ["tomater"],
  gurka: ["gurka"],
  paprika: ["paprika"],
  potatis: ["potatis"],
  banan: ["banan"],
  apple: ["äpple", "äpplen"],
  citron: ["citron"],
  champinjoner: ["champinjoner"],
  mjolk: ["mellanmjölk", "mjölk"],
  agg: ["ägg"],
  smor: ["smör"],
  vispgradde: ["vispgrädde", "grädde"],
  hushallsost: ["hushållsost", "ost "],
  "creme-fraiche": ["crème fraiche", "creme fraiche"],
  fetaost: ["fetaost", "feta"],
  brod: ["bröd", "limpa", "råg"],
  kaffe: ["kaffe"],
  juice: ["juice"],
  "frysta-gronsaker": ["grönsaksblandning", "wokgrönsaker", "gröna ärter"],
  glass: ["glass"],
  godis: ["godis"],
  chips: ["chips"],
  toapapper: ["toalettpapper"],
};

async function fetchOffers(base, storeId) {
  const url =
    `${base}/search/campaigns/offline?q=${encodeURIComponent(storeId + ":relevance")}` +
    `&type=PERSONAL_GENERAL&page=0&size=300`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${base} ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

const offers = [];
// a couple of large stores from each chain gives broad assortment coverage
for (const [base, storeIds] of [
  ["https://www.willys.se", ["2258", "2117"]],
  ["https://www.hemkop.se", ["4150", "1117"]],
]) {
  for (const id of storeIds) {
    try {
      const r = await fetchOffers(base, id);
      offers.push(...r);
      console.log(`${base} store ${id}: ${r.length} offers`);
    } catch (err) {
      console.warn(`skipping ${base} ${id}:`, err.message);
    }
  }
}

async function searchProduct(q) {
  const url = `https://www.willys.se/search/clean?q=${encodeURIComponent(q)}&page=0&size=10`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = (data.results ?? []).find(
    (o) => o.image?.url && (o.name ?? "").toLowerCase().includes(q.split(" ")[0])
  ) ?? (data.results ?? []).find((o) => o.image?.url);
  return hit?.image?.url ?? null;
}

const images = {};
for (const [slug, keywords] of Object.entries(WANTED)) {
  for (const kw of keywords) {
    const hit = offers.find((o) => {
      const name = (o.potentialPromotions?.[0]?.name ?? o.name ?? "").toLowerCase();
      return name.includes(kw) && o.image?.url;
    });
    if (hit) {
      images[slug] = hit.image.url;
      break;
    }
  }
  // not on offer this week -> grab from the regular assortment search instead
  if (!images[slug]) {
    const url = await searchProduct(keywords[0].trim());
    if (url) images[slug] = url;
    else console.warn(`no image found for ${slug}`);
  }
}

const file = `/**
 * Real product photos from the Axfood image CDN (assets.axfood.se), matched
 * to the canonical products by scripts/scrape-product-images.mjs.
 * Generated ${new Date().toISOString().slice(0, 10)} – re-run the script to refresh.
 */
export const PRODUCT_IMAGES: Record<string, string> = ${JSON.stringify(images, null, 2)};
`;
writeFileSync(new URL("../lib/data/product-images.ts", import.meta.url), file);
console.log(`\nwrote ${Object.keys(images).length}/${Object.keys(WANTED).length} images`);
