"use client";

import {
  BookOpen,
  Download,
  FilePlus,
  FolderOpen,
  GitCompare,
  Redo2,
  RotateCcw,
  Save,
  Undo2,
} from "lucide-react";

import type { TreeFile } from "@/lib/types";

import { UploadDialog } from "./UploadDialog";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onOpenCompare: () => void;
  onOpenReset: () => void;
  onUploadTree: (tree: TreeFile) => void;
  onNewTree: () => void;
  onToggleLegend: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  undoDisabled: boolean;
  redoDisabled: boolean;
}

export function Toolbar({
  onOpenSave,
  onOpenLoad,
  onOpenCompare,
  onOpenReset,
  onUploadTree,
  onNewTree,
  onToggleLegend,
  onExport,
  onUndo,
  onRedo,
  undoDisabled,
  redoDisabled,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.group}>
        <button type="button" className={styles.button} onClick={onUndo} disabled={undoDisabled}>
          <Undo2 size={14} />
          Undo
        </button>
        <button type="button" className={styles.button} onClick={onRedo} disabled={redoDisabled}>
          <Redo2 size={14} />
          Redo
        </button>
      </div>

      <div className={styles.group}>
        <button type="button" className={styles.button} onClick={onOpenLoad}>
          <FolderOpen size={14} />
          Load
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={onOpenSave}
        >
          <Save size={14} />
          Save
        </button>
        <button type="button" className={styles.button} onClick={onNewTree}>
          <FilePlus size={14} />
          New
        </button>
        <UploadDialog onLoad={onUploadTree} />
      </div>

      <div className={styles.group}>
        <button type="button" className={styles.button} onClick={onOpenCompare}>
          <GitCompare size={14} />
          Compare
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonDanger}`}
          onClick={onOpenReset}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <div className={styles.group}>
        <button type="button" className={styles.button} onClick={onExport}>
          <Download size={14} />
          Export
        </button>
        <button type="button" className={styles.button} onClick={onToggleLegend}>
          <BookOpen size={14} />
          Legend
        </button>
      </div>
    </div>
  );
}
