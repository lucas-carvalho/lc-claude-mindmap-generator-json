import dagre from "@dagrejs/dagre";
import { Position } from "@xyflow/react";

import type { TreeNode } from "./types";
import { treeToFlowElements } from "./treeUtils";
import type { FlowEdge, FlowNode } from "./treeUtils";

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 72;

export type LayoutDirection = "TB" | "LR";

/**
 * Positions are always recomputed from the tree's parent/child shape (never
 * read from stored x/y) — this deterministic pass is the "fixed template"
 * applied uniformly to whatever tree data is loaded.
 */
export function applyDagreLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: LayoutDirection = "TB",
): FlowNode[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, nodesep: 48, ranksep: 96 });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const isHorizontal = direction === "LR";

  return nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    return {
      ...node,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
    };
  });
}

export function layoutTree(
  root: TreeNode,
  direction: LayoutDirection = "TB",
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const { nodes, edges } = treeToFlowElements(root);
  return { nodes: applyDagreLayout(nodes, edges, direction), edges };
}
