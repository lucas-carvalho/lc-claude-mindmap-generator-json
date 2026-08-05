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
  metadata?: Record<string, string>;
  side: BranchSide;
  branchColor: string;
}

export type FlowNode = Node<TreeNodeData>;
export type FlowEdge = Edge;

export function generateNodeId(): string {
  return crypto.randomUUID();
}

export function createChildNode(label: string): TreeNode {
  return { id: generateNodeId(), label, children: [] };
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
