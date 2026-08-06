import type { TreeFile, TreeNode, TreeSlot, TreeSlotSummary } from "./types";

export interface PlatformSaveInput {
  id: string;
  name: string;
  root: TreeNode;
  orphans: TreeNode[];
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

export async function fetchSlots(): Promise<TreeSlotSummary[]> {
  const res = await fetch("/api/trees");
  const body = await parseJsonOrThrow<{ slots: TreeSlotSummary[] }>(res);
  return body.slots;
}

export async function fetchSlot(slot: TreeSlot): Promise<TreeFile> {
  const res = await fetch(`/api/trees/${slot}`);
  return parseJsonOrThrow<TreeFile>(res);
}

export async function saveSlot(
  slot: TreeSlot,
  input: { name: string; activePlatformId: string; platforms: PlatformSaveInput[] },
): Promise<TreeFile> {
  const res = await fetch(`/api/trees/${slot}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonOrThrow<TreeFile>(res);
}

export async function deleteSlotRequest(slot: TreeSlot): Promise<void> {
  const res = await fetch(`/api/trees/${slot}`, { method: "DELETE" });
  await parseJsonOrThrow<{ ok: true }>(res);
}
