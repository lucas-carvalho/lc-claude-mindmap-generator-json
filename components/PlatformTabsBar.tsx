"use client";

import { useState } from "react";
import { Copy, Pencil, X } from "lucide-react";

import { MAX_PLATFORMS_PER_SLOT } from "@/lib/types";
import type { PlatformInstance } from "@/lib/types";

import styles from "./PlatformTabsBar.module.css";

interface PlatformTabsBarProps {
  platforms: PlatformInstance[];
  viewedPlatformId: string;
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: () => void;
  onDelete: (id: string) => void;
}

export function PlatformTabsBar({
  platforms,
  viewedPlatformId,
  onSwitch,
  onRename,
  onDuplicate,
  onDelete,
}: PlatformTabsBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const startEditing = (platform: PlatformInstance) => {
    setEditingId(platform.id);
    setDraftName(platform.name);
  };

  const commitEditing = () => {
    if (editingId && draftName.trim()) {
      onRename(editingId, draftName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className={styles.bar}>
      {platforms.map((platform) => {
        const isActive = platform.id === viewedPlatformId;
        const isEditing = editingId === platform.id;

        return (
          <div key={platform.id} className={`${styles.tab} ${isActive ? styles.active : ""}`}>
            {isEditing ? (
              <input
                autoFocus
                className={styles.renameInput}
                value={draftName}
                maxLength={60}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitEditing}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitEditing();
                  if (event.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <button type="button" className={styles.tabLabel} onClick={() => onSwitch(platform.id)}>
                {platform.name}
              </button>
            )}
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Rename ${platform.name}`}
              onClick={() => startEditing(platform)}
            >
              <Pencil size={12} />
            </button>
            {platforms.length > 1 && (
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Delete ${platform.name}`}
                onClick={() => onDelete(platform.id)}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        className={styles.duplicateButton}
        disabled={platforms.length >= MAX_PLATFORMS_PER_SLOT}
        onClick={onDuplicate}
        title={
          platforms.length >= MAX_PLATFORMS_PER_SLOT
            ? `Maximum of ${MAX_PLATFORMS_PER_SLOT} platform tabs`
            : "Duplicate the current tab into a new one"
        }
      >
        <Copy size={12} />
        Duplicate
      </button>
    </div>
  );
}
