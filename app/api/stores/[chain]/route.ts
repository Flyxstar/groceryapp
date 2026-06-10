import { NextRequest, NextResponse } from "next/server";
import { fetchAxfoodStores, isAxfoodChain } from "@/lib/integrations/axfood";
import { Chain } from "@/lib/types";

/** GET /api/stores/willys – live store list (Axfood chains only). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chain: string }> }
) {
  const { chain } = await params;
  if (!isAxfoodChain(chain as Chain)) {
    return NextResponse.json({ error: "no live store source for this chain" }, { status: 404 });
  }
  try {
    const stores = await fetchAxfoodStores(chain as Chain);
    return NextResponse.json({ stores });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
