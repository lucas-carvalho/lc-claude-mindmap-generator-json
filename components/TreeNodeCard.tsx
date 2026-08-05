"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { FlowNode } from "@/lib/treeUtils";

import { StatusBadge } from "./StatusBadge";
import styles from "./TreeNodeCard.module.css";

export function TreeNodeCard({ data, selected }: NodeProps<FlowNode>) {
  const isRoot = data.side === "root";
  const isLeft = data.side === "left";

  return (
    <div
      className={`${styles.card} ${isRoot ? styles.root : ""} ${selected ? styles.selected : ""}`}
      style={{ borderColor: data.branchColor, background: isRoot ? data.branchColor : undefined }}
    >
      {!isRoot && <Handle type="target" position={isLeft ? Position.Right : Position.Left} />}
      <div className={styles.headerRow}>
        {data.type && <span className={styles.type}>{data.type}</span>}
        <StatusBadge status={data.status} />
      </div>
      <div className={styles.label}>{data.label}</div>
      {isRoot ? (
        <>
          <Handle type="source" position={Position.Left} id="left" />
          <Handle type="source" position={Position.Right} id="right" />
        </>
      ) : (
        <Handle type="source" position={isLeft ? Position.Left : Position.Right} />
      )}
    </div>
  );
}
