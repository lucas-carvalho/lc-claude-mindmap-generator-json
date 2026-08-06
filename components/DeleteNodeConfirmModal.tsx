"use client";

import { Trash2 } from "lucide-react";

import styles from "./DeleteNodeConfirmModal.module.css";

interface DeleteNodeConfirmModalProps {
  nodeLabel: string;
  childCount: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteNodeConfirmModal({
  nodeLabel,
  childCount,
  onConfirm,
  onClose,
}: DeleteNodeConfirmModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>
            <Trash2 size={16} />
            Delete node
          </h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className={styles.warning}>
          Delete <strong>{nodeLabel}</strong>?
          {childCount > 0
            ? ` Its ${childCount} child ${childCount === 1 ? "node" : "nodes"} will remain, shown as unlinked until reconnected or deleted.`
            : ""}
        </p>
        <p className={styles.hint}>You can undo this from the toolbar.</p>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.deleteButton} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
