"use client";

import styles from "./Toolbar.module.css";

interface ToolbarProps {
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onResetSample: () => void;
}

export function Toolbar({ onOpenSave, onOpenLoad, onResetSample }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.button} onClick={onOpenLoad}>
        Load
      </button>
      <button type="button" className={styles.button} onClick={onOpenSave}>
        Save
      </button>
      <button type="button" className={styles.button} onClick={onResetSample}>
        Reset to sample
      </button>
    </div>
  );
}
