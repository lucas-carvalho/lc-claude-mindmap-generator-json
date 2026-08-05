"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  getNodesBounds,
  getViewportForBounds,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import type { NodeMouseHandler, NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toSvg } from "html-to-image";

import { layoutTree } from "@/lib/treeLayout";
import type { TreeNode } from "@/lib/types";
import { findNodeById, getShapeSignature, TREE_NODE_TYPE } from "@/lib/treeUtils";
import type { FlowNode } from "@/lib/treeUtils";

import { NodeDetailPanel } from "./NodeDetailPanel";
import { TreeNodeCard } from "./TreeNodeCard";
import styles from "./MindmapCanvas.module.css";

const EXPORT_WIDTH = 1600;
const EXPORT_HEIGHT = 1200;
const EXPORT_PADDING = 0.15;

interface ExportHandleProps {
  exportRef: React.RefObject<(() => void) | null>;
  colorMode: "light" | "dark";
  treeName: string;
}

/** Rendered as a child of <ReactFlow> purely so useReactFlow() resolves
 * without an explicit ReactFlowProvider — exposes an imperative export
 * function to the parent via a plain ref (no visible output of its own). */
function ExportHandle({ exportRef, colorMode, treeName }: ExportHandleProps) {
  const { getNodes } = useReactFlow();

  useEffect(() => {
    exportRef.current = () => {
      const currentNodes = getNodes();
      if (currentNodes.length === 0) return;

      const bounds = getNodesBounds(currentNodes);
      const { x, y, zoom } = getViewportForBounds(
        bounds,
        EXPORT_WIDTH,
        EXPORT_HEIGHT,
        0.1,
        2,
        EXPORT_PADDING,
      );
      const viewportEl = document.querySelector(".react-flow__viewport");
      if (!(viewportEl instanceof HTMLElement)) return;

      void toSvg(viewportEl, {
        backgroundColor: colorMode === "dark" ? "#0a0a0a" : "#ffffff",
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        style: {
          width: `${EXPORT_WIDTH}px`,
          height: `${EXPORT_HEIGHT}px`,
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        },
      }).then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `${treeName.trim().replace(/\s+/g, "-").toLowerCase() || "mindmap"}.svg`;
        link.href = dataUrl;
        link.click();
      });
    };

    return () => {
      exportRef.current = null;
    };
  }, [exportRef, getNodes, colorMode, treeName]);

  return null;
}

interface MindmapCanvasProps {
  root: TreeNode;
  treeName: string;
  colorMode: "light" | "dark";
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onNodeUpdate: (currentId: string, patch: Partial<TreeNode>) => void;
  onAddChild: (parentId: string) => void;
  exportRef: React.RefObject<(() => void) | null>;
}

export function MindmapCanvas({
  root,
  treeName,
  colorMode,
  selectedNodeId,
  onSelectNode,
  onNodeUpdate,
  onAddChild,
  exportRef,
}: MindmapCanvasProps) {
  const layout = useMemo(() => layoutTree(root), [root]);
  const shapeSignature = useMemo(() => getShapeSignature(root), [root]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const [pinned, setPinned] = useState(false);

  const nodeTypes = useMemo(
    () => ({
      [TREE_NODE_TYPE]: (props: NodeProps<FlowNode>) => (
        <TreeNodeCard
          {...props}
          onStatusChange={(status) => onNodeUpdate(props.id, { status })}
          onAssigneeChange={(assignee) => onNodeUpdate(props.id, { assignee })}
        />
      ),
    }),
    [onNodeUpdate],
  );

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
        <ExportHandle exportRef={exportRef} colorMode={colorMode} treeName={treeName} />
      </ReactFlow>
      <NodeDetailPanel
        node={selectedNode}
        root={root}
        pinned={pinned}
        onTogglePinned={() => setPinned((current) => !current)}
        onUpdate={onNodeUpdate}
        onAddChild={onAddChild}
        onClose={() => onSelectNode(null)}
      />
    </div>
  );
}
