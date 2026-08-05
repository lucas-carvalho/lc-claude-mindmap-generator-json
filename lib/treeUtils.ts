import type { Edge, Node } from "@xyflow/react";

import type { TreeNode } from "./types";

export const TREE_NODE_TYPE = "treeNode";

export type BranchSide = "left" | "right" | "root";

export const BRANCH_PALETTE = [
  "#2f6fed",
  "#e0554f",
  "#2fa84f",
  "#c77d21",
  "#7c5cd4",
  "#0f9b8e",
  "#d13a7d",
  "#5c7cfa",
  "#e0a30a",
  "#3f9142",
];
export const ROOT_COLOR = "#3f3f46";

export interface TreeNodeData extends Record<string, unknown> {
  label: string;
  type?: string;
  status?: string;
  notes?: string;
  assignee?: string;
  metadata?: Record<string, string>;
  side: BranchSide;
  branchColor: string;
}

/** First letter of the first and last whitespace-separated word, uppercased. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export type FlowNode = Node<TreeNodeData>;
export type FlowEdge = Edge;

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "node"
  );
}

/**
 * The new id always builds on the parent's id plus a slug of the label
 * ("inherits the parent's id logic, complemented by an objective
 * abstraction of the label"), deduped against every id already in the
 * tree. Only derived once at creation time — id stays a stable,
 * independently-editable field afterward, same as everywhere else.
 */
export function generateChildId(parentId: string, label: string, existingIds: Set<string>): string {
  const base = `${parentId}-${slugify(label)}`;
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function subtreeSize(node: TreeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + subtreeSize(child), 0);
}

/**
 * Splits root.children into two roughly weight-balanced groups (by subtree
 * size, heaviest first) instead of a raw count split, so one huge branch
 * doesn't lopside the canvas. Original order is preserved within each side.
 * A lone child goes right, matching the FreeMind/Mindmeister convention.
 */
export function assignBranchSides(children: TreeNode[]): { left: TreeNode[]; right: TreeNode[] } {
  const weighted = children.map((child, index) => ({ child, index, weight: subtreeSize(child) }));
  const sorted = [...weighted].sort((a, b) => b.weight - a.weight);

  let leftWeight = 0;
  let rightWeight = 0;
  const leftItems: typeof weighted = [];
  const rightItems: typeof weighted = [];

  for (const item of sorted) {
    if (rightWeight <= leftWeight) {
      rightItems.push(item);
      rightWeight += item.weight;
    } else {
      leftItems.push(item);
      leftWeight += item.weight;
    }
  }

  const byIndex = (a: { index: number }, b: { index: number }) => a.index - b.index;
  return {
    left: leftItems.sort(byIndex).map((item) => item.child),
    right: rightItems.sort(byIndex).map((item) => item.child),
  };
}

function visitBranch(
  node: TreeNode,
  parentId: string,
  side: "left" | "right",
  branchColor: string,
  isDirectRootChild: boolean,
  nodes: FlowNode[],
  edges: FlowEdge[],
): void {
  nodes.push({
    id: node.id,
    type: TREE_NODE_TYPE,
    position: { x: 0, y: 0 },
    data: {
      label: node.label,
      type: node.type,
      status: node.status,
      notes: node.notes,
      assignee: node.assignee,
      metadata: node.metadata,
      side,
      branchColor,
    },
  });

  edges.push({
    id: `${parentId}->${node.id}`,
    source: parentId,
    target: node.id,
    ...(isDirectRootChild ? { sourceHandle: side } : {}),
    style: { stroke: branchColor, strokeWidth: 2 },
  });

  node.children.forEach((child) =>
    visitBranch(child, node.id, side, branchColor, false, nodes, edges),
  );
}

export function treeToFlowElements(root: TreeNode): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [
    {
      id: root.id,
      type: TREE_NODE_TYPE,
      position: { x: 0, y: 0 },
      data: {
        label: root.label,
        type: root.type,
        status: root.status,
        notes: root.notes,
        assignee: root.assignee,
        metadata: root.metadata,
        side: "root",
        branchColor: ROOT_COLOR,
      },
    },
  ];
  const edges: FlowEdge[] = [];

  const { right } = assignBranchSides(root.children);
  const rightIds = new Set(right.map((child) => child.id));

  root.children.forEach((child, index) => {
    const side: "left" | "right" = rightIds.has(child.id) ? "right" : "left";
    const branchColor = BRANCH_PALETTE[index % BRANCH_PALETTE.length];
    visitBranch(child, root.id, side, branchColor, true, nodes, edges);
  });

  return { nodes, edges };
}

export function findNodeById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Immutably replaces the node matching `id` with `updater(node)`. Only
 * objects on the path from root to the target are recreated — sibling
 * branches keep their exact previous identity, so callers can tell a
 * content-only edit apart from a structural change by reference equality.
 */
export function updateNodeById(
  root: TreeNode,
  id: string,
  updater: (node: TreeNode) => TreeNode,
): TreeNode {
  if (root.id === id) return updater(root);

  let changed = false;
  const children = root.children.map((child) => {
    const next = updateNodeById(child, id, updater);
    if (next !== child) changed = true;
    return next;
  });

  return changed ? { ...root, children } : root;
}

export function collectAllIds(root: TreeNode, acc: Set<string> = new Set()): Set<string> {
  acc.add(root.id);
  root.children.forEach((child) => collectAllIds(child, acc));
  return acc;
}

/**
 * An ordered join of every node id in the tree. Two trees with the same
 * signature have identical shape (same nodes, same parent/child structure)
 * even if unrelated content fields (label/status/notes/...) differ —
 * used to tell "a node's properties changed" apart from "the tree's shape
 * changed" (nodes added/removed, or a different tree entirely).
 */
export function getShapeSignature(root: TreeNode): string {
  const ids: string[] = [];
  (function walk(node: TreeNode) {
    ids.push(node.id);
    node.children.forEach(walk);
  })(root);
  return ids.join(",");
}
