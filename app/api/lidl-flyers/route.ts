import { NextResponse } from "next/server";
import { fetchLidlFlyers } from "@/lib/integrations/lidl";

/** GET /api/lidl-flyers – the currently valid real Lidl flyers. */
export async function GET() {
  try {
    const flyers = await fetchLidlFlyers();
    return NextResponse.json({ flyers });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
