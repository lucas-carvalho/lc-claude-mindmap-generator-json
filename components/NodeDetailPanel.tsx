"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { FilePlus, Lock, Pin, PinOff, Plus, Trash2 } from "lucide-react";

import {
  collectAllIds,
  findParentId,
  generateChildId,
  getNodeDepth,
  getTypeLabelForDepth,
} from "@/lib/treeUtils";
import type { TreeNode } from "@/lib/types";

import { STATUS_META } from "./StatusBadge";
import styles from "./NodeDetailPanel.module.css";

interface NodeDetailPanelProps {
  node: TreeNode | null;
  root: TreeNode;
  pinned: boolean;
  onTogglePinned: () => void;
  onUpdate: (currentId: string, patch: Partial<TreeNode>) => void;
  onAddChild: (parentId: string) => void;
  onRequestDelete: (id: string) => void;
  onClose: () => void;
}

export function NodeDetailPanel({
  node,
  root,
  pinned,
  onTogglePinned,
  onUpdate,
  onAddChild,
  onRequestDelete,
  onClose,
}: NodeDetailPanelProps) {
  const [lastNodeId, setLastNodeId] = useState<string | null>(node?.id ?? null);
  const [draftId, setDraftId] = useState(node?.id ?? "");
  const [draftLabel, setDraftLabel] = useState(node?.label ?? "");
  const [draftNotes, setDraftNotes] = useState(node?.notes ?? "");
  const [draftAssignee, setDraftAssignee] = useState(node?.assignee ?? "");
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
    setDraftNotes(node.notes ?? "");
    setDraftAssignee(node.assignee ?? "");
    setMetadataRows(Object.entries(node.metadata ?? {}));
    setIdError(null);
  }

  // Dragging: position persists across node switches while the panel stays
  // open, and only resets to the default corner once it's fully closed
  // (node becomes null) and later reopens.
  const [wasOpen, setWasOpen] = useState(node !== null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  if (node && !wasOpen) {
    setWasOpen(true);
    setOffset({ x: 0, y: 0 });
  } else if (!node && wasOpen) {
    setWasOpen(false);
  }

  if (!node) return null;

  const handleHeaderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-no-drag]")) return;
    dragStartRef.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleHeaderPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStartRef.current) return;
    const dx = event.clientX - dragStartRef.current.x;
    const dy = event.clientY - dragStartRef.current.y;
    setOffset({ x: dragStartRef.current.offsetX + dx, y: dragStartRef.current.offsetY + dy });
  };

  const handleHeaderPointerUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  const commitLabel = () => {
    const trimmed = draftLabel.trim();
    if (!trimmed) {
      setDraftLabel(node.label);
      return;
    }
    if (trimmed === node.label) return;

    // If this node's id still matches what the auto-generated scheme would
    // have produced for its OLD label, it hasn't been manually customized —
    // keep it in sync with the new label. Otherwise leave a custom id alone.
    const parentId = findParentId(root, node.id);
    if (parentId) {
      const childType = getTypeLabelForDepth(getNodeDepth(root, node.id));
      const existingIds = collectAllIds(root);
      existingIds.delete(node.id);
      const autoIdForOldLabel = generateChildId(parentId, node.label, childType, existingIds);
      if (node.id === autoIdForOldLabel) {
        const newId = generateChildId(parentId, trimmed, childType, existingIds);
        onUpdate(node.id, { label: trimmed, id: newId });
        return;
      }
    }
    onUpdate(node.id, { label: trimmed });
  };

  const commitNotes = () => {
    onUpdate(node.id, { notes: draftNotes.trim() || undefined });
  };

  const commitAssignee = () => {
    onUpdate(node.id, { assignee: draftAssignee.trim() || undefined });
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

  const typeLabel = getTypeLabelForDepth(getNodeDepth(root, node.id));

  return (
    <aside className={styles.panel} style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <div
        className={styles.headerRow}
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <div>
          <span className={styles.eyebrow}>Drag to reposition</span>
          <h2 className={styles.title}>Edit node</h2>
        </div>
        <div className={styles.headerActions} data-no-drag>
          {node.id !== root.id && (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => onRequestDelete(node.id)}
              aria-label="Delete node"
              data-no-drag
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            className={styles.pinButton}
            onClick={onTogglePinned}
            aria-label={pinned ? "Unpin panel" : "Pin panel open"}
            aria-pressed={pinned}
            data-no-drag
          >
            {pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
            data-no-drag
          >
            ×
          </button>
        </div>
      </div>

      <div className={styles.childRow}>
        <p className={styles.childCount}>
          {node.children.length} child {node.children.length === 1 ? "node" : "nodes"}
        </p>
        <button type="button" className={styles.addChildButton} onClick={() => onAddChild(node.id)}>
          <FilePlus size={12} />
          Add child node
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
        ID
        <input
          className={styles.input}
          value={draftId}
          onChange={(event) => setDraftId(event.target.value)}
          onBlur={commitId}
        />
      </label>
      {idError && <p className={styles.idError}>{idError}</p>}

      <label className={styles.field}>
        <span className={styles.lockedFieldLabel}>
          Type
          <span
            className={styles.lockIcon}
            title="Automatically set by this node's position in the tree — Feature, Scenario, or Test case (recursively, for anything under a Scenario)."
          >
            <Lock size={11} />
          </span>
        </span>
        <select className={styles.input} value={typeLabel} disabled>
          <option value={typeLabel}>{typeLabel}</option>
        </select>
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
        Assignee
        <input
          className={styles.input}
          value={draftAssignee}
          placeholder="Full name"
          onChange={(event) => setDraftAssignee(event.target.value)}
          onBlur={commitAssignee}
        />
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

      <div className={styles.metadataSection}>
        <span className={styles.fieldLabel}>Metadata</span>
        <p className={styles.metadataHint}>
          Free-form key/value pairs for anything the fields above don&apos;t cover (e.g. a ticket link,
          environment name, or build number).
        </p>
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
    </aside>
  );
}
