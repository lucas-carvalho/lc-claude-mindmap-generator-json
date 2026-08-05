import { hierarchy, tree as d3tree } from "d3-hierarchy";

import type { TreeNode } from "./types";
import { assignBranchSides, treeToFlowElements } from "./treeUtils";
import type { FlowEdge, FlowNode } from "./treeUtils";

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 72;
const LEVEL_SPACING = NODE_WIDTH + 90;
const SIBLING_SPACING = NODE_HEIGHT + 24;

const SYNTHETIC_ROOT_ID = "__mindmap_layout_synthetic_root__";

interface SyntheticRoot {
  id: typeof SYNTHETIC_ROOT_ID;
  children: TreeNode[];
}

type LayoutDatum = SyntheticRoot | TreeNode;

interface PositionedPoint {
  id: string;
  x: number;
  y: number;
}

/**
 * Lays out one side (left or right) of the mindmap independently: a
 * synthetic invisible super-root stands in for the real root so d3-hierarchy
 * can balance/space this side's top-level branches, then its position is
 * discarded and used only to recenter this side back onto the real root.
 */
function layoutSide(children: TreeNode[], side: 1 | -1): PositionedPoint[] {
  if (children.length === 0) return [];

  const synthetic: SyntheticRoot = { id: SYNTHETIC_ROOT_ID, children };
  const root = hierarchy<LayoutDatum>(synthetic, (d) => d.children);

  const layout = d3tree<LayoutDatum>()
    .nodeSize([SIBLING_SPACING, LEVEL_SPACING])
    .separation((a, b) => {
      if (a.parent?.data.id === SYNTHETIC_ROOT_ID) return 2;
      return a.parent === b.parent ? 1 : 1.6;
    });

  const positionedRoot = layout(root);
  const originX = positionedRoot.x ?? 0;

  return positionedRoot
    .descendants()
    .filter((node) => node.data.id !== SYNTHETIC_ROOT_ID)
    .map((node) => ({
      id: node.data.id,
      x: side * (node.y ?? 0),
      y: (node.x ?? 0) - originX,
    }));
}

/**
 * Positions are always recomputed from the tree's parent/child shape (never
 * read from stored x/y) — this deterministic pass is the "fixed template"
 * applied uniformly to whatever tree data is loaded. Root sits at the
 * center; each side is laid out independently via d3-hierarchy and mirrored
 * for the left side, producing the classic bidirectional mindmap shape.
 */
export function layoutTree(root: TreeNode): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const { nodes, edges } = treeToFlowElements(root);
  const { left, right } = assignBranchSides(root.children);

  const positioned: PositionedPoint[] = [
    { id: root.id, x: 0, y: 0 },
    ...layoutSide(right, 1),
    ...layoutSide(left, -1),
  ];
  const positionById = new Map(positioned.map((point) => [point.id, point]));

  return {
    nodes: nodes.map((node) => {
      const point = positionById.get(node.id) ?? { x: 0, y: 0 };
      return {
        ...node,
        position: { x: point.x - NODE_WIDTH / 2, y: point.y - NODE_HEIGHT / 2 },
      };
    }),
    edges,
  };
}
