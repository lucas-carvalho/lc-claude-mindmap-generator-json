import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteSlot, InvalidSlotError, readSlot, writeSlot } from "@/lib/fsTrees";
import { TreeSaveRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ slot: string }> };

function parseSlot(raw: string): number {
  return Number.parseInt(raw, 10);
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slot } = await params;

  try {
    const file = await readSlot(parseSlot(slot));
    if (!file) {
      return NextResponse.json({ error: "Slot is empty" }, { status: 404 });
    }
    return NextResponse.json(file);
  } catch (err) {
    if (err instanceof InvalidSlotError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to read slot" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { slot } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = TreeSaveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid tree payload", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const saved = await writeSlot(parseSlot(slot), parsed.data);
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof InvalidSlotError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save slot" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { slot } = await params;

  try {
    const existed = await deleteSlot(parseSlot(slot));
    if (!existed) {
      return NextResponse.json({ error: "Slot is already empty" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidSlotError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 });
  }
}
