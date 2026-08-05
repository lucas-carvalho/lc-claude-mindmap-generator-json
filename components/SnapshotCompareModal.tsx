"use client";

import { useMemo, useState } from "react";

import { diffTrees } from "@/lib/treeDiff";
import type { PlatformInstance, TreeFile, TreeNode } from "@/lib/types";

import { StatusBadge } from "./StatusBadge";
import styles from "./SnapshotCompareModal.module.css";

interface VersionOption {
  key: string;
  label: string;
  root: TreeNode;
}

function buildVersionOptions(platform: PlatformInstance): VersionOption[] {
  const current: VersionOption = { key: "current", label: "Current", root: platform.root };
  const snapshots: VersionOption[] = platform.snapshots.map((snapshot, index) => ({
    key: snapshot.id,
    label: `Snapshot ${index + 1} · ${new Date(snapshot.capturedAt).toLocaleString()}`,
    root: snapshot.root,
  }));
  return [current, ...snapshots];
}

interface SnapshotCompareModalProps {
  tree: TreeFile;
  initialPlatformId: string;
  onClose: () => void;
}

export function SnapshotCompareModal({ tree, initialPlatformId, onClose }: SnapshotCompareModalProps) {
  const [platformId, setPlatformId] = useState(initialPlatformId);
  const platform = tree.platforms.find((p) => p.id === platformId) ?? tree.platforms[0];

  const options = useMemo(() => buildVersionOptions(platform), [platform]);

  const [beforeKey, setBeforeKey] = useState(options[1]?.key ?? options[0].key);
  const [afterKey, setAfterKey] = useState(options[0].key);

  // Reset the before/after selection whenever a different platform is picked
  // (same render-time-adjustment pattern MindmapCanvas uses for its layout).
  const [platformForKeys, setPlatformForKeys] = useState(platform);
  if (platformForKeys !== platform) {
    setPlatformForKeys(platform);
    setBeforeKey(options[1]?.key ?? options[0].key);
    setAfterKey(options[0].key);
  }

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
          <h2 className={styles.title}>
            Compare versions — {tree.name}
            {tree.platforms.length > 1 ? ` · ${platform.name}` : ""}
          </h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {tree.platforms.length > 1 && (
          <label className={styles.selectField}>
            Platform
            <select value={platformId} onChange={(event) => setPlatformId(event.target.value)}>
              {tree.platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {platform.snapshots.length === 0 ? (
          <p className={styles.hint}>
            This platform has no snapshot history yet — save it again after making a change to
            start comparing versions.
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
