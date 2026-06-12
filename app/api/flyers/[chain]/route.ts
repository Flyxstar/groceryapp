import { NextRequest, NextResponse } from "next/server";
import { fetchRealFlyers } from "@/lib/integrations/tjek";
import { CHAINS } from "@/lib/data/stores";
import { Chain } from "@/lib/types";

/**
 * GET /api/flyers/lidl?lat=59.34&lng=18.05
 * The chain's current real flyer(s): original page images + offer hotspots.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chain: string }> }
) {
  const { chain } = await params;
  if (!(chain in CHAINS)) {
    return NextResponse.json({ error: "unknown chain" }, { status: 404 });
  }
  const lat = Number(req.nextUrl.searchParams.get("lat") ?? 59.3345);
  const lng = Number(req.nextUrl.searchParams.get("lng") ?? 18.0632);
  try {
    const flyers = await fetchRealFlyers(chain as Chain, lat, lng);
    return NextResponse.json({ flyers });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
