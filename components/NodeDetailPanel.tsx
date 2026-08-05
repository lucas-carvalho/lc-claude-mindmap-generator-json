"use client";

import type { TreeNode } from "@/lib/types";

import { StatusBadge } from "./StatusBadge";
import styles from "./NodeDetailPanel.module.css";

interface NodeDetailPanelProps {
  node: TreeNode | null;
  onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  if (!node) return null;

  const metadataEntries = Object.entries(node.metadata ?? {});

  return (
    <aside className={styles.panel}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>{node.label}</h2>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className={styles.metaRow}>
        {node.type && <span className={styles.type}>{node.type}</span>}
        <StatusBadge status={node.status} />
      </div>
      {node.notes && <p className={styles.notes}>{node.notes}</p>}
      {metadataEntries.length > 0 && (
        <dl className={styles.metadataList}>
          {metadataEntries.map(([key, value]) => (
            <div key={key} className={styles.metadataItem}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className={styles.childCount}>
        {node.children.length} child {node.children.length === 1 ? "node" : "nodes"}
      </p>
    </aside>
  );
}
