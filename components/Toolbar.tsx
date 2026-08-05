"use client";

import type { TreeFile } from "@/lib/types";

import { UploadDialog } from "./UploadDialog";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onOpenCompare: () => void;
  onResetSample: () => void;
  onUploadTree: (tree: TreeFile) => void;
}

export function Toolbar({
  onOpenSave,
  onOpenLoad,
  onOpenCompare,
  onResetSample,
  onUploadTree,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.button} onClick={onOpenLoad}>
        Load
      </button>
      <button type="button" className={styles.button} onClick={onOpenSave}>
        Save
      </button>
      <button type="button" className={styles.button} onClick={onOpenCompare}>
        Compare versions
      </button>
      <UploadDialog onLoad={onUploadTree} />
      <button type="button" className={styles.button} onClick={onResetSample}>
        Reset to sample
      </button>
    </div>
  );
}
