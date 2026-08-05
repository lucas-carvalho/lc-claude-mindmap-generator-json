import type { TreeNode } from "./types";

export type DiffStatus = "added" | "removed" | "changed" | "unchanged";

export interface DiffEntry {
  id: string;
  status: DiffStatus;
  before?: TreeNode;
  after?: TreeNode;
  changedFields?: string[];
}

export interface TreeDiff {
  entries: DiffEntry[];
  addedCount: number;
  removedCount: number;
  changedCount: number;
}

const COMPARABLE_FIELDS: Array<keyof TreeNode> = ["label", "type", "status", "notes"];

function flatten(root: TreeNode, map: Map<string, TreeNode> = new Map()): Map<string, TreeNode> {
  map.set(root.id, root);
  root.children.forEach((child) => flatten(child, map));
  return map;
}

function fieldsThatChanged(before: TreeNode, after: TreeNode): string[] {
  return COMPARABLE_FIELDS.filter((field) => before[field] !== after[field]);
}

/**
 * Compares two states of the SAME tree (e.g. current vs. a past snapshot in
 * that tree's own history). Never intended to compare unrelated trees.
 */
export function diffTrees(before: TreeNode, after: TreeNode): TreeDiff {
  const beforeMap = flatten(before);
  const afterMap = flatten(after);
  const ids = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  const entries: DiffEntry[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let changedCount = 0;

  for (const id of ids) {
    const beforeNode = beforeMap.get(id);
    const afterNode = afterMap.get(id);

    if (!beforeNode && afterNode) {
      entries.push({ id, status: "added", after: afterNode });
      addedCount += 1;
    } else if (beforeNode && !afterNode) {
      entries.push({ id, status: "removed", before: beforeNode });
      removedCount += 1;
    } else if (beforeNode && afterNode) {
      const changedFields = fieldsThatChanged(beforeNode, afterNode);
      if (changedFields.length > 0) {
        entries.push({ id, status: "changed", before: beforeNode, after: afterNode, changedFields });
        changedCount += 1;
      } else {
        entries.push({ id, status: "unchanged", before: beforeNode, after: afterNode });
      }
    }
  }

  return { entries, addedCount, removedCount, changedCount };
}
