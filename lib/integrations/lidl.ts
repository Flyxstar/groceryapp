/**
 * Live adapter for Lidl's flyer overview.
 *
 * https://www.lidl.se/c/reklamblad/s10018018 is the *stable* overview page –
 * it always lists the currently valid flyers. The individual weekly flyers
 * behind it (".../erbjudanden-vecka-NN/...") rotate every week, so we parse
 * the overview on every request (cached 30 min) instead of hardcoding links.
 *
 * The flyer *viewer* itself is a JS app on the schwarz "leaflets" platform
 * whose data API (endpoints.leaflets.schwarz) only accepts browser TLS
 * sessions, so item-level data is not available server-side – we surface the
 * real flyers (title, validity, cover image, link) and keep the in-app
 * circling flyer as the interactive fallback.
 */

export interface LidlFlyer {
  url: string;
  title: string;
  validity: string;
  cover?: string;
  week?: number;
}

const OVERVIEW_URL = "https://www.lidl.se/c/reklamblad/s10018018";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

export async function fetchLidlFlyers(): Promise<LidlFlyer[]> {
  const res = await fetch(OVERVIEW_URL, {
    headers: { "User-Agent": UA, "Accept-Language": "sv" },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`Lidl overview ${res.status}`);
  const html = await res.text();

  const flyers: LidlFlyer[] = [];
  const seen = new Set<string>();
  const re = /<a [^>]*href="(https:\/\/www\.lidl\.se\/l\/sv\/reklamblad\/[^"]+)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (seen.has(url)) continue;
    seen.add(url);
    // the card's cover image and two text lines live right after the anchor
    const chunk = html.slice(m.index, m.index + 1500);
    const cover = chunk.match(/src="(https:\/\/imgproxy\.leaflets\.schwarz[^"]+)"/)?.[1];
    const texts = chunk
      .replace(/<svg[\s\S]*?<\/svg>/g, " ")
      .replace(/<[^>]+>/g, "\n")
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    const validity = texts[0] ?? "";
    const title = texts[1] ?? texts[0] ?? "Reklamblad";
    const week = url.match(/vecka-(\d+)/)?.[1];
    flyers.push({ url, title, validity, cover, week: week ? Number(week) : undefined });
  }
  // weekly offer flyers first, newest week first
  return flyers.sort((a, b) => (b.week ?? -1) - (a.week ?? -1));
}
