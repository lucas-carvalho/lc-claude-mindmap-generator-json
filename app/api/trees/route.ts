import { NextResponse } from "next/server";

import { listSlots } from "@/lib/fsTrees";

export const runtime = "nodejs";

export async function GET() {
  const slots = await listSlots();
  return NextResponse.json({ slots });
}
