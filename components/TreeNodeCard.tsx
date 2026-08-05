"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { FlowNode } from "@/lib/treeUtils";

import { StatusBadge } from "./StatusBadge";
import styles from "./TreeNodeCard.module.css";

export function TreeNodeCard({ data, selected }: NodeProps<FlowNode>) {
  return (
    <div className={`${styles.card} ${selected ? styles.selected : ""}`}>
      <Handle type="target" position={Position.Top} />
      <div className={styles.headerRow}>
        {data.type && <span className={styles.type}>{data.type}</span>}
        <StatusBadge status={data.status} />
      </div>
      <div className={styles.label}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
