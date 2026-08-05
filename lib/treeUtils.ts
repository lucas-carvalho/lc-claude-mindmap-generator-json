import type { Edge, Node } from "@xyflow/react";

import type { TreeNode } from "./types";

export const TREE_NODE_TYPE = "treeNode";

export interface TreeNodeData extends Record<string, unknown> {
  label: string;
  type?: string;
  status?: string;
  notes?: string;
  metadata?: Record<string, string>;
}

export type FlowNode = Node<TreeNodeData>;
export type FlowEdge = Edge;

export function generateNodeId(): string {
  return crypto.randomUUID();
}

export function createChildNode(label: string): TreeNode {
  return { id: generateNodeId(), label, children: [] };
}

export function treeToFlowElements(root: TreeNode): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  function visit(node: TreeNode, parentId: string | null): void {
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
      },
    });

    if (parentId) {
      edges.push({ id: `${parentId}->${node.id}`, source: parentId, target: node.id });
    }

    node.children.forEach((child) => visit(child, node.id));
  }

  visit(root, null);
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
