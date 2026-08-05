"use client";

import { useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState } from "@xyflow/react";
import type { NodeMouseHandler } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { layoutTree } from "@/lib/treeLayout";
import type { TreeNode } from "@/lib/types";
import { findNodeById, TREE_NODE_TYPE } from "@/lib/treeUtils";

import { NodeDetailPanel } from "./NodeDetailPanel";
import { TreeNodeCard } from "./TreeNodeCard";
import styles from "./MindmapCanvas.module.css";

const nodeTypes = { [TREE_NODE_TYPE]: TreeNodeCard };

interface MindmapCanvasProps {
  root: TreeNode;
}

export function MindmapCanvas({ root }: MindmapCanvasProps) {
  const layout = useMemo(() => layoutTree(root), [root]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  // Reset the rendered layout when a different tree is loaded (new `root`
  // identity), following React's "adjust state during render" pattern —
  // deliberately not a useEffect, to avoid the extra render pass.
  const [layoutForRoot, setLayoutForRoot] = useState(layout);
  if (layoutForRoot !== layout) {
    setLayoutForRoot(layout);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setSelectedNode(null);
  }

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    setSelectedNode(findNodeById(root, node.id));
  };

  return (
    <div className={styles.wrapper}>
      <ReactFlow
        style={{ width: "100%", height: "100%" }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={() => setSelectedNode(null)}
        nodesDraggable={false}
        fitView
      >
        <Background />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap position="bottom-left" pannable zoomable />
      </ReactFlow>
      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}
