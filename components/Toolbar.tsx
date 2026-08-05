"use client";

import { FolderOpen, GitCompare, RotateCcw, Save } from "lucide-react";

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
        <FolderOpen size={14} />
        Load
      </button>
      <button type="button" className={styles.button} onClick={onOpenSave}>
        <Save size={14} />
        Save
      </button>
      <button type="button" className={styles.button} onClick={onOpenCompare}>
        <GitCompare size={14} />
        Compare
      </button>
      <UploadDialog onLoad={onUploadTree} />
      <button type="button" className={styles.button} onClick={onResetSample}>
        <RotateCcw size={14} />
        Reset
      </button>
    </div>
  );
}
