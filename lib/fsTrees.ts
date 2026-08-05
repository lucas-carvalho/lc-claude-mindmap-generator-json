import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { TreeFileSchema } from "./schema";
import { MAX_SNAPSHOTS_PER_SLOT, TREE_SLOT_COUNT } from "./types";
import type { TreeFile, TreeNode, TreeSlot, TreeSlotSummary } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "trees");

export class InvalidSlotError extends Error {
  constructor(slot: number) {
    super(`Invalid tree slot: ${slot}. Must be an integer between 1 and ${TREE_SLOT_COUNT}.`);
    this.name = "InvalidSlotError";
  }
}

function assertValidSlot(slot: number): asserts slot is TreeSlot {
  if (!Number.isInteger(slot) || slot < 1 || slot > TREE_SLOT_COUNT) {
    throw new InvalidSlotError(slot);
  }
}

function slotToFilename(slot: TreeSlot): string {
  return path.join(DATA_DIR, `slot-${slot}.json`);
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ENOENT"
  );
}

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readSlot(slot: number): Promise<TreeFile | null> {
  assertValidSlot(slot);
  await ensureDataDir();
  try {
    const raw = await readFile(slotToFilename(slot), "utf-8");
    return TreeFileSchema.parse(JSON.parse(raw));
  } catch (err) {
    if (isNotFoundError(err)) return null;
    throw err;
  }
}

export async function listSlots(): Promise<TreeSlotSummary[]> {
  const summaries: TreeSlotSummary[] = [];
  for (let slot = 1; slot <= TREE_SLOT_COUNT; slot++) {
    const file = await readSlot(slot);
    summaries.push(
      file
        ? {
            slot: slot as TreeSlot,
            occupied: true,
            name: file.name,
            updatedAt: file.updatedAt,
            snapshotCount: file.snapshots.length,
          }
        : { slot: slot as TreeSlot, occupied: false },
    );
  }
  return summaries;
}

export async function writeSlot(
  slot: number,
  input: { name: string; root: TreeNode },
): Promise<TreeFile> {
  assertValidSlot(slot);
  await ensureDataDir();

  const existing = await readSlot(slot);
  const now = new Date().toISOString();

  const snapshots = existing
    ? [
        { id: randomUUID(), capturedAt: existing.updatedAt, root: existing.root },
        ...existing.snapshots,
      ].slice(0, MAX_SNAPSHOTS_PER_SLOT)
    : [];

  const next: TreeFile = {
    schemaVersion: 1,
    id: existing?.id ?? randomUUID(),
    name: input.name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    root: input.root,
    snapshots,
  };

  const target = slotToFilename(slot);
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(next, null, 2), "utf-8");
  await rename(tmp, target);

  return next;
}

export async function deleteSlot(slot: number): Promise<boolean> {
  assertValidSlot(slot);
  await ensureDataDir();
  try {
    await unlink(slotToFilename(slot));
    return true;
  } catch (err) {
    if (isNotFoundError(err)) return false;
    throw err;
  }
}
