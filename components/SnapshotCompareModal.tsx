"use client";

import { useMemo, useState } from "react";

import { diffTrees } from "@/lib/treeDiff";
import type { TreeFile, TreeNode } from "@/lib/types";

import { StatusBadge } from "./StatusBadge";
import styles from "./SnapshotCompareModal.module.css";

interface VersionOption {
  key: string;
  label: string;
  root: TreeNode;
}

function buildVersionOptions(tree: TreeFile): VersionOption[] {
  const current: VersionOption = {
    key: "current",
    label: `Current · updated ${new Date(tree.updatedAt).toLocaleString()}`,
    root: tree.root,
  };
  const snapshots: VersionOption[] = tree.snapshots.map((snapshot, index) => ({
    key: snapshot.id,
    label: `Snapshot ${index + 1} · ${new Date(snapshot.capturedAt).toLocaleString()}`,
    root: snapshot.root,
  }));
  return [current, ...snapshots];
}

interface SnapshotCompareModalProps {
  tree: TreeFile;
  onClose: () => void;
}

export function SnapshotCompareModal({ tree, onClose }: SnapshotCompareModalProps) {
  const options = useMemo(() => buildVersionOptions(tree), [tree]);
  const [beforeKey, setBeforeKey] = useState(options[1]?.key ?? options[0].key);
  const [afterKey, setAfterKey] = useState(options[0].key);

  const beforeOption = options.find((option) => option.key === beforeKey) ?? options[0];
  const afterOption = options.find((option) => option.key === afterKey) ?? options[0];

  const diff = useMemo(
    () => diffTrees(beforeOption.root, afterOption.root),
    [beforeOption, afterOption],
  );

  const changedEntries = diff.entries.filter((entry) => entry.status !== "unchanged");

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Compare versions — {tree.name}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {tree.snapshots.length === 0 ? (
          <p className={styles.hint}>
            This tree has no snapshot history yet — save it again after making a change to start
            comparing versions.
          </p>
        ) : (
          <>
            <div className={styles.selectRow}>
              <label className={styles.selectField}>
                Before
                <select value={beforeKey} onChange={(event) => setBeforeKey(event.target.value)}>
                  {options.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.selectField}>
                After
                <select value={afterKey} onChange={(event) => setAfterKey(event.target.value)}>
                  {options.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className={styles.summary}>
              {diff.addedCount} added · {diff.removedCount} removed · {diff.changedCount} changed
            </p>

            {changedEntries.length === 0 ? (
              <p className={styles.hint}>No differences between these two versions.</p>
            ) : (
              <ul className={styles.entryList}>
                {changedEntries.map((entry) => (
                  <li key={entry.id} className={styles.entryRow}>
                    <span className={`${styles.entryStatus} ${styles[entry.status]}`}>
                      {entry.status}
                    </span>
                    <span className={styles.entryLabel}>
                      {(entry.after ?? entry.before)?.label}
                    </span>
                    {entry.status === "changed" && (
                      <span className={styles.entryFields}>
                        {entry.changedFields?.join(", ")}
                      </span>
                    )}
                    <StatusBadge status={entry.after?.status ?? entry.before?.status} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
