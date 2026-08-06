"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState } from "@xyflow/react";
import type { NodeMouseHandler, NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { layoutTree } from "@/lib/treeLayout";
import type { TreeNode } from "@/lib/types";
import { findNodeById, getShapeSignature, TREE_NODE_TYPE } from "@/lib/treeUtils";
import type { FlowNode } from "@/lib/treeUtils";

import { NodeDetailPanel } from "./NodeDetailPanel";
import { TreeNodeCard } from "./TreeNodeCard";
import styles from "./MindmapCanvas.module.css";

interface MindmapCanvasProps {
  root: TreeNode;
  orphans: TreeNode[];
  colorMode: "light" | "dark";
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onNodeUpdate: (currentId: string, patch: Partial<TreeNode>) => void;
  onAddChild: (parentId: string) => void;
  onRequestDeleteNode: (id: string) => void;
}

export function MindmapCanvas({
  root,
  orphans,
  colorMode,
  selectedNodeId,
  onSelectNode,
  onNodeUpdate,
  onAddChild,
  onRequestDeleteNode,
}: MindmapCanvasProps) {
  const layout = useMemo(() => layoutTree(root, orphans), [root, orphans]);
  const shapeSignature = useMemo(
    () => `${getShapeSignature(root)}|${orphans.map(getShapeSignature).join(",")}`,
    [root, orphans],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const [pinned, setPinned] = useState(false);

  // React Flow warns (error#002) whenever the per-key component inside
  // nodeTypes changes reference between renders. Routing onNodeUpdate
  // through a ref — instead of the memo's dependency array — means
  // nodeTypes is built exactly once and never again, while the wrapped
  // callbacks still always call the latest onNodeUpdate. The ref is synced
  // in an effect (not during render) per the rules-of-hooks lint rule.
  const onNodeUpdateRef = useRef(onNodeUpdate);
  useEffect(() => {
    onNodeUpdateRef.current = onNodeUpdate;
  });

  const nodeTypes = useMemo(
    () => ({
      [TREE_NODE_TYPE]: (props: NodeProps<FlowNode>) => (
        <TreeNodeCard
          {...props}
          onStatusChange={(status) => onNodeUpdateRef.current(props.id, { status })}
          onAssigneeChange={(assignee) => onNodeUpdateRef.current(props.id, { assignee })}
        />
      ),
    }),
    [],
  );

  // Distinguish a structural change (nodes added/removed, or a genuinely
  // different tree loaded) from a content-only edit (label/status/notes on
  // an existing node): the former recomputes positions from the algorithm
  // as before; the latter only patches each node's `data`, leaving current
  // positions (including any manual drag) untouched. Render-time adjustment
  // pattern, not a useEffect, matching the rest of this codebase.
  const [lastRoot, setLastRoot] = useState(root);
  const [lastOrphans, setLastOrphans] = useState(orphans);
  const [lastShapeSignature, setLastShapeSignature] = useState(shapeSignature);
  if (root !== lastRoot || orphans !== lastOrphans) {
    setLastRoot(root);
    setLastOrphans(orphans);
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

  const selectedNode = selectedNodeId
    ? (findNodeById(root, selectedNodeId) ??
      orphans.map((orphan) => findNodeById(orphan, selectedNodeId)).find((found) => found) ??
      null)
    : null;

  // Keyboard delete: Delete/Backspace requests deleting the selected node,
  // guarded against firing while typing in any form field (so editing Notes
  // text isn't misread as "delete the node") and against the true root.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedNodeId || selectedNodeId === root.id) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      event.preventDefault();
      onRequestDeleteNode(selectedNodeId);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, root.id, onRequestDeleteNode]);

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
        onPaneClick={() => {
          if (!pinned) onSelectNode(null);
        }}
        fitView
      >
        <Background />
        <Controls position="bottom-right" showInteractive={false} style={{ bottom: 150 }} />
        <MiniMap
          position="bottom-right"
          style={{ width: 160, height: 120 }}
          nodeColor={(node: FlowNode) => node.data.branchColor}
          nodeStrokeColor={(node: FlowNode) => node.data.branchColor}
          maskColor="rgba(37, 99, 235, 0.15)"
          maskStrokeColor="#2563eb"
          maskStrokeWidth={2}
          pannable
          zoomable
        />
      </ReactFlow>
      <NodeDetailPanel
        node={selectedNode}
        root={root}
        pinned={pinned}
        onTogglePinned={() => setPinned((current) => !current)}
        onUpdate={onNodeUpdate}
        onAddChild={onAddChild}
        onRequestDelete={onRequestDeleteNode}
        onClose={() => onSelectNode(null)}
      />
    </div>
  );
}
