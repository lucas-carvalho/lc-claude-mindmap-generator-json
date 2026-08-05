"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { collectAllIds } from "@/lib/treeUtils";
import type { TreeNode } from "@/lib/types";

import { STATUS_META } from "./StatusBadge";
import styles from "./NodeDetailPanel.module.css";

interface NodeDetailPanelProps {
  node: TreeNode | null;
  root: TreeNode;
  onUpdate: (currentId: string, patch: Partial<TreeNode>) => void;
  onClose: () => void;
}

export function NodeDetailPanel({ node, root, onUpdate, onClose }: NodeDetailPanelProps) {
  const [lastNodeId, setLastNodeId] = useState<string | null>(node?.id ?? null);
  const [draftId, setDraftId] = useState(node?.id ?? "");
  const [draftLabel, setDraftLabel] = useState(node?.label ?? "");
  const [draftType, setDraftType] = useState(node?.type ?? "");
  const [draftNotes, setDraftNotes] = useState(node?.notes ?? "");
  const [metadataRows, setMetadataRows] = useState<Array<[string, string]>>(
    Object.entries(node?.metadata ?? {}),
  );
  const [idError, setIdError] = useState<string | null>(null);

  // Resync drafts whenever the SELECTED node changes (a different node was
  // clicked, or this node's id was just renamed) — render-time adjustment,
  // matching the pattern already used in MindmapCanvas/SnapshotCompareModal.
  if (node && node.id !== lastNodeId) {
    setLastNodeId(node.id);
    setDraftId(node.id);
    setDraftLabel(node.label);
    setDraftType(node.type ?? "");
    setDraftNotes(node.notes ?? "");
    setMetadataRows(Object.entries(node.metadata ?? {}));
    setIdError(null);
  }

  if (!node) return null;

  const commitLabel = () => {
    const trimmed = draftLabel.trim();
    if (trimmed) onUpdate(node.id, { label: trimmed });
    else setDraftLabel(node.label);
  };

  const commitType = () => {
    onUpdate(node.id, { type: draftType.trim() || undefined });
  };

  const commitNotes = () => {
    onUpdate(node.id, { notes: draftNotes.trim() || undefined });
  };

  const commitId = () => {
    const trimmed = draftId.trim();
    if (!trimmed) {
      setIdError("ID can't be empty");
      setDraftId(node.id);
      return;
    }
    if (trimmed === node.id) {
      setIdError(null);
      return;
    }
    const otherIds = collectAllIds(root);
    otherIds.delete(node.id);
    if (otherIds.has(trimmed)) {
      setIdError("Another node already uses this ID");
      return;
    }
    setIdError(null);
    onUpdate(node.id, { id: trimmed });
  };

  const commitMetadata = (rows: Array<[string, string]>) => {
    setMetadataRows(rows);
    const metadata = Object.fromEntries(rows.filter(([key]) => key.trim()));
    onUpdate(node.id, { metadata: Object.keys(metadata).length > 0 ? metadata : undefined });
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Edit node</h2>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <label className={styles.field}>
        Label
        <input
          className={styles.input}
          value={draftLabel}
          onChange={(event) => setDraftLabel(event.target.value)}
          onBlur={commitLabel}
        />
      </label>

      <label className={styles.field}>
        Type
        <input
          className={styles.input}
          value={draftType}
          onChange={(event) => setDraftType(event.target.value)}
          onBlur={commitType}
        />
      </label>

      <label className={styles.field}>
        Status
        <select
          className={styles.input}
          value={node.status ?? ""}
          onChange={(event) => onUpdate(node.id, { status: event.target.value || undefined })}
        >
          <option value="">No status</option>
          {Object.entries(STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        Notes
        <textarea
          className={styles.textarea}
          rows={3}
          value={draftNotes}
          onChange={(event) => setDraftNotes(event.target.value)}
          onBlur={commitNotes}
        />
      </label>

      <label className={styles.field}>
        ID
        <input
          className={styles.input}
          value={draftId}
          onChange={(event) => setDraftId(event.target.value)}
          onBlur={commitId}
        />
      </label>
      {idError && <p className={styles.idError}>{idError}</p>}

      <div className={styles.metadataSection}>
        <span className={styles.fieldLabel}>Metadata</span>
        {metadataRows.map(([key, value], index) => (
          <div key={index} className={styles.metadataRow}>
            <input
              className={styles.metadataKeyInput}
              placeholder="key"
              value={key}
              onChange={(event) => {
                const rows: Array<[string, string]> = [...metadataRows];
                rows[index] = [event.target.value, value];
                setMetadataRows(rows);
              }}
              onBlur={() => commitMetadata(metadataRows)}
            />
            <input
              className={styles.metadataValueInput}
              placeholder="value"
              value={value}
              onChange={(event) => {
                const rows: Array<[string, string]> = [...metadataRows];
                rows[index] = [key, event.target.value];
                setMetadataRows(rows);
              }}
              onBlur={() => commitMetadata(metadataRows)}
            />
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Remove metadata row"
              onClick={() => commitMetadata(metadataRows.filter((_, i) => i !== index))}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.addRowButton}
          onClick={() => setMetadataRows([...metadataRows, ["", ""]])}
        >
          <Plus size={12} />
          Add field
        </button>
      </div>

      <p className={styles.childCount}>
        {node.children.length} child {node.children.length === 1 ? "node" : "nodes"}
      </p>
    </aside>
  );
}
