import { NextRequest, NextResponse } from "next/server";
import { fetchAxfoodOffers, isAxfoodChain } from "@/lib/integrations/axfood";
import { Chain } from "@/lib/types";

/** GET /api/offers/willys?storeId=2258 – this week's live offers for a store. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chain: string }> }
) {
  const { chain } = await params;
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!isAxfoodChain(chain as Chain)) {
    return NextResponse.json({ error: "no live offer source for this chain" }, { status: 404 });
  }
  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }
  try {
    const { items, validUntil } = await fetchAxfoodOffers(chain as Chain, storeId);
    return NextResponse.json({ items, validUntil, count: items.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
