"use client";

import { useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState } from "@xyflow/react";
import type { NodeMouseHandler } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { layoutTree } from "@/lib/treeLayout";
import type { TreeNode } from "@/lib/types";
import { findNodeById, getShapeSignature, TREE_NODE_TYPE } from "@/lib/treeUtils";
import type { FlowNode } from "@/lib/treeUtils";

import { NodeDetailPanel } from "./NodeDetailPanel";
import { TreeNodeCard } from "./TreeNodeCard";
import styles from "./MindmapCanvas.module.css";

const nodeTypes = { [TREE_NODE_TYPE]: TreeNodeCard };

interface MindmapCanvasProps {
  root: TreeNode;
  colorMode: "light" | "dark";
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onNodeUpdate: (currentId: string, patch: Partial<TreeNode>) => void;
}

export function MindmapCanvas({
  root,
  colorMode,
  selectedNodeId,
  onSelectNode,
  onNodeUpdate,
}: MindmapCanvasProps) {
  const layout = useMemo(() => layoutTree(root), [root]);
  const shapeSignature = useMemo(() => getShapeSignature(root), [root]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  // Distinguish a structural change (nodes added/removed, or a genuinely
  // different tree loaded) from a content-only edit (label/status/notes on
  // an existing node): the former recomputes positions from the algorithm
  // as before; the latter only patches each node's `data`, leaving current
  // positions (including any manual drag) untouched. Render-time adjustment
  // pattern, not a useEffect, matching the rest of this codebase.
  const [lastRoot, setLastRoot] = useState(root);
  const [lastShapeSignature, setLastShapeSignature] = useState(shapeSignature);
  if (root !== lastRoot) {
    setLastRoot(root);
    setLastShapeSignature(shapeSignature);
    if (shapeSignature !== lastShapeSignature) {
      setNodes(layout.nodes);
      setEdges(layout.edges);
    } else {
      setNodes((current) =>
        current.map((node) => {
          const updated = layout.nodes.find((ln) => ln.id === node.id);
          return updated ? { ...node, data: updated.data } : node;
        }),
      );
    }
  }

  const selectedNode = selectedNodeId ? findNodeById(root, selectedNodeId) : null;

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    onSelectNode(node.id);
  };

  return (
    <div className={styles.wrapper}>
      <ReactFlow
        style={{ width: "100%", height: "100%" }}
        colorMode={colorMode}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={() => onSelectNode(null)}
        fitView
      >
        <Background />
        <Controls position="bottom-right" showInteractive={false} style={{ bottom: 150 }} />
        <MiniMap
          position="bottom-right"
          style={{ width: 160, height: 120 }}
          nodeColor={(node: FlowNode) => node.data.branchColor}
          nodeStrokeColor={(node: FlowNode) => node.data.branchColor}
          pannable
          zoomable
        />
      </ReactFlow>
      <NodeDetailPanel
        node={selectedNode}
        root={root}
        onUpdate={onNodeUpdate}
        onClose={() => onSelectNode(null)}
      />
    </div>
  );
}
