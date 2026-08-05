"use client";

import type { TreeFile } from "@/lib/types";

import { UploadDialog } from "./UploadDialog";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onResetSample: () => void;
  onUploadTree: (tree: TreeFile) => void;
}

export function Toolbar({ onOpenSave, onOpenLoad, onResetSample, onUploadTree }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.button} onClick={onOpenLoad}>
        Load
      </button>
      <button type="button" className={styles.button} onClick={onOpenSave}>
        Save
      </button>
      <UploadDialog onLoad={onUploadTree} />
      <button type="button" className={styles.button} onClick={onResetSample}>
        Reset to sample
      </button>
    </div>
  );
}
