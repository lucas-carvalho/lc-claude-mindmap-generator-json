import { hierarchy, tree as d3tree } from "d3-hierarchy";

import type { TreeNode } from "./types";
import { assignBranchSides, orphanToFlowElements, treeToFlowElements } from "./treeUtils";
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

const ORPHAN_MARGIN_TOP = 140;
const ORPHAN_GAP = SIBLING_SPACING * 2;

/**
 * Each orphan subtree gets its own independent layout — reusing layoutSide
 * as if the orphan's own root were a lone "right-side" branch — then all
 * of them are stacked in a column below the main tree's own bounding box,
 * so they're always visible but never overlap it or each other.
 */
function layoutOrphans(orphans: TreeNode[], startY: number): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let cursorY = startY;

  orphans.forEach((orphanRoot) => {
    const flow = orphanToFlowElements(orphanRoot);
    const positioned = layoutSide([orphanRoot], 1);
    const positionById = new Map(positioned.map((point) => [point.id, point]));
    const ys = flow.nodes.map((node) => positionById.get(node.id)?.y ?? 0);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    flow.nodes.forEach((node) => {
      const point = positionById.get(node.id) ?? { x: 0, y: 0 };
      nodes.push({
        ...node,
        position: { x: point.x - NODE_WIDTH / 2, y: point.y - minY + cursorY },
      });
    });
    edges.push(...flow.edges);

    cursorY += maxY - minY + NODE_HEIGHT + ORPHAN_GAP;
  });

  return { nodes, edges };
}

/**
 * Positions are always recomputed from the tree's parent/child shape (never
 * read from stored x/y) — this deterministic pass is the "fixed template"
 * applied uniformly to whatever tree data is loaded. Root sits at the
 * center; each side is laid out independently via d3-hierarchy and mirrored
 * for the left side, producing the classic bidirectional mindmap shape.
 * Detached orphan subtrees (see lib/treeUtils.ts) are laid out separately
 * and stacked below the main tree, always visible but never connected to it.
 */
export function layoutTree(
  root: TreeNode,
  orphans: TreeNode[] = [],
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const { nodes, edges } = treeToFlowElements(root);
  const { left, right } = assignBranchSides(root.children);

  const positioned: PositionedPoint[] = [
    { id: root.id, x: 0, y: 0 },
    ...layoutSide(right, 1),
    ...layoutSide(left, -1),
  ];
  const positionById = new Map(positioned.map((point) => [point.id, point]));

  const mainNodes = nodes.map((node) => {
    const point = positionById.get(node.id) ?? { x: 0, y: 0 };
    return {
      ...node,
      position: { x: point.x - NODE_WIDTH / 2, y: point.y - NODE_HEIGHT / 2 },
    };
  });

  if (orphans.length === 0) {
    return { nodes: mainNodes, edges };
  }

  const maxMainY = Math.max(0, ...mainNodes.map((node) => node.position.y + NODE_HEIGHT));
  const orphanLayout = layoutOrphans(orphans, maxMainY + ORPHAN_MARGIN_TOP);

  return {
    nodes: [...mainNodes, ...orphanLayout.nodes],
    edges: [...edges, ...orphanLayout.edges],
  };
}
