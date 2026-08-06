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
  /** True for every node in a detached orphan subtree (see orphanToFlowElements) — no path back to the main root. */
  disconnected?: boolean;
}

/** Neutral gray for orphan/"unlinked" subtrees — distinct from both the
 * branch palette and the Status colors, so a floating cluster reads as
 * "detached" rather than as a normal (if oddly colored) branch. */
export const ORPHAN_COLOR = "#9ca3af";

/** First letter of the first and last whitespace-separated word, uppercased. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Deliberately avoids red/orange/green/blue/gray — those are already the
// semantic Status colors (see StatusBadge's STATUS_META) — so an assignee
// avatar is never mistaken for a status signal.
const ASSIGNEE_PALETTE = [
  "#475569",
  "#4f46e5",
  "#0d9488",
  "#7c3aed",
  "#0891b2",
  "#a21caf",
  "#78716c",
  "#0369a1",
];

/** Deterministic per-name color, so the same person always gets the same
 * avatar color across the whole diagram regardless of which branch/node
 * they're assigned to. */
export function getAssigneeColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return ASSIGNEE_PALETTE[hash % ASSIGNEE_PALETTE.length];
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

const TYPE_ID_PREFIXES: Record<string, string> = {
  feature: "feature",
  scenario: "scenario",
  "test case": "tc",
};

/**
 * Strips a known type prefix ("feature-", "scenario-", "tc-") off an id,
 * leaving its own distinguishing complement — e.g. "scenario-login" ->
 * "login". Falls back to the id as-is for anything that doesn't match
 * (the root, or a custom/uploaded tree not using this convention).
 */
function stripKnownPrefix(id: string): string {
  for (const prefix of Object.values(TYPE_ID_PREFIXES)) {
    if (id === prefix) return "";
    if (id.startsWith(`${prefix}-`)) return id.slice(prefix.length + 1);
  }
  return id;
}

/**
 * Type-prefixed ids matching the bundled sample data's own convention
 * (feature-auth, scenario-login, tc-login-valid, ...) rather than a
 * chained parent-id prefix. Feature/Scenario ids reset fresh to
 * `{prefix}-{slug(label)}`, ignoring the parent entirely (e.g.
 * "scenario-login" doesn't reference its feature parent). Test case ids
 * fold in the parent's own complement so sibling test cases across
 * different scenarios don't collide on short labels — this also
 * recurses naturally for test-case-under-test-case, since the immediate
 * parent (itself already "tc-...") supplies its own complement. Deduped
 * against every id already in the tree. Only derived once at creation
 * time (or re-derived on a Label edit if the id still matches this
 * scheme — see NodeDetailPanel's commitLabel) — id stays a stable,
 * independently-editable field once manually customized.
 */
export function generateChildId(
  parentId: string,
  label: string,
  childType: string,
  existingIds: Set<string>,
): string {
  const prefix = TYPE_ID_PREFIXES[childType] ?? slugify(childType);
  const labelSlug = slugify(label);
  const base =
    childType === "test case"
      ? [prefix, stripKnownPrefix(parentId), labelSlug].filter(Boolean).join("-")
      : `${prefix}-${labelSlug}`;
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
  depth: number,
  nodes: FlowNode[],
  edges: FlowEdge[],
): void {
  nodes.push({
    id: node.id,
    type: TREE_NODE_TYPE,
    position: { x: 0, y: 0 },
    data: {
      label: node.label,
      type: getTypeLabelForDepth(depth),
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
    visitBranch(child, node.id, side, branchColor, false, depth + 1, nodes, edges),
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
        type: getTypeLabelForDepth(0),
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
    visitBranch(child, root.id, side, branchColor, true, 1, nodes, edges);
  });

  return { nodes, edges };
}

/**
 * A simpler sibling of visitBranch/treeToFlowElements for a single detached
 * orphan subtree: no branch-color/side assignment (always the muted
 * ORPHAN_COLOR, arbitrarily "right"-sided so the existing Handle rendering
 * still applies) and no depth-based Type — every node is "unlinked",
 * recursively, since none of them have a path back to the real root.
 * Internal edges between nodes WITHIN the subtree are still drawn (dashed,
 * in the orphan color) — only the (nonexistent) edge to a parent is absent,
 * since that's the connection that was actually severed.
 */
function visitOrphanBranch(
  node: TreeNode,
  parentId: string,
  isTopOfOrphan: boolean,
  nodes: FlowNode[],
  edges: FlowEdge[],
): void {
  nodes.push({
    id: node.id,
    type: TREE_NODE_TYPE,
    position: { x: 0, y: 0 },
    data: {
      label: node.label,
      type: "unlinked",
      status: node.status,
      notes: node.notes,
      assignee: node.assignee,
      metadata: node.metadata,
      side: "right",
      branchColor: ORPHAN_COLOR,
      disconnected: true,
    },
  });

  if (!isTopOfOrphan) {
    edges.push({
      id: `${parentId}->${node.id}`,
      source: parentId,
      target: node.id,
      style: { stroke: ORPHAN_COLOR, strokeWidth: 2, strokeDasharray: "6 4" },
    });
  }

  node.children.forEach((child) => visitOrphanBranch(child, node.id, false, nodes, edges));
}

export function orphanToFlowElements(orphanRoot: TreeNode): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  visitOrphanBranch(orphanRoot, "", true, nodes, edges);
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

/** Returns the id of `id`'s parent within this tree, or null if `id` is
 * the root itself or isn't found (e.g. it's an orphan, living outside
 * this tree entirely). */
export function findParentId(root: TreeNode, id: string): string | null {
  for (const child of root.children) {
    if (child.id === id) return root.id;
    const found = findParentId(child, id);
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

/**
 * Removes the node matching `id` from the tree, returning both the updated
 * tree and the removed node's own children — the caller promotes those to
 * new top-level orphans, since they're not deleted along with their parent.
 * Returns null if `id` isn't found among any descendant (e.g. it's the
 * true root itself, which can't be removed this way).
 */
export function removeNodeById(
  root: TreeNode,
  id: string,
): { tree: TreeNode; removedChildren: TreeNode[] } | null {
  let removedChildren: TreeNode[] | null = null;

  function walk(node: TreeNode): TreeNode {
    const match = node.children.find((child) => child.id === id);
    if (match) {
      removedChildren = match.children;
      return { ...node, children: node.children.filter((child) => child.id !== id) };
    }
    let changed = false;
    const children = node.children.map((child) => {
      const next = walk(child);
      if (next !== child) changed = true;
      return next;
    });
    return changed ? { ...node, children } : node;
  }

  const tree = walk(root);
  return removedChildren ? { tree, removedChildren } : null;
}

export function collectAllIds(root: TreeNode, acc: Set<string> = new Set()): Set<string> {
  acc.add(root.id);
  root.children.forEach((child) => collectAllIds(child, acc));
  return acc;
}

/** Depth of `id` from `root` (root itself is 0), or -1 if not found. */
export function getNodeDepth(root: TreeNode, id: string, depth = 0): number {
  if (root.id === id) return depth;
  for (const child of root.children) {
    const found = getNodeDepth(child, id, depth + 1);
    if (found !== -1) return found;
  }
  return -1;
}

const DEPTH_TYPE_LABELS = ["suite", "feature", "scenario"] as const;

/**
 * Depths 0-2 map to the fixed suite/feature/scenario labels; anything
 * deeper is always "test case", recursively, with no upper bound. Type is
 * a computed function of tree position, not a stored/editable value — see
 * NodeDetailPanel's locked Type field.
 */
export function getTypeLabelForDepth(depth: number): string {
  return DEPTH_TYPE_LABELS[depth] ?? "test case";
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
