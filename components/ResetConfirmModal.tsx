"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";

import styles from "./ResetConfirmModal.module.css";

interface ResetConfirmModalProps {
  platformName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ResetConfirmModal({ platformName, onConfirm, onClose }: ResetConfirmModalProps) {
  const [typedName, setTypedName] = useState("");
  const matches = typedName.trim() === platformName;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>
            <TriangleAlert size={16} />
            Reset platform
          </h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className={styles.warning}>
          This discards every change to the <strong>{platformName}</strong> platform and restores the
          bundled sample data. This can&apos;t be undone.
        </p>

        <label className={styles.confirmField}>
          {`Type "${platformName}" to confirm`}
          <input
            autoFocus
            className={styles.confirmInput}
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
          />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.resetButton}
            disabled={!matches}
            onClick={onConfirm}
          >
            Reset platform
          </button>
        </div>
      </div>
    </div>
  );
}
