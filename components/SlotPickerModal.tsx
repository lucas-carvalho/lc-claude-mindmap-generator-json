"use client";

import { useState } from "react";

import type { TreeSlot, TreeSlotSummary } from "@/lib/types";

import styles from "./SlotPickerModal.module.css";

interface SlotPickerModalProps {
  mode: "load" | "save";
  slots: TreeSlotSummary[];
  loading: boolean;
  disabled?: boolean;
  defaultName?: string;
  onClose: () => void;
  onSelectSlot: (slot: TreeSlot, name?: string) => void;
  onDeleteSlot: (slot: TreeSlot) => void;
}

export function SlotPickerModal({
  mode,
  slots,
  loading,
  disabled = false,
  defaultName,
  onClose,
  onSelectSlot,
  onDeleteSlot,
}: SlotPickerModalProps) {
  const [name, setName] = useState(defaultName ?? "");

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>{mode === "save" ? "Save to a slot" : "Load a slot"}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {mode === "save" && (
          <label className={styles.nameField}>
            Tree name
            <input
              className={styles.nameInput}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
            />
          </label>
        )}

        {loading ? (
          <p className={styles.hint}>Loading slots…</p>
        ) : (
          <>
            {mode === "load" && slots.length > 0 && slots.every((slot) => !slot.occupied) && (
              <p className={styles.hint}>No trees saved yet — save one from the toolbar first.</p>
            )}
            <ul className={styles.slotList}>
              {slots.map((slot) => (
                <li key={slot.slot} className={styles.slotRow}>
                  <div className={styles.slotInfo}>
                    <span className={styles.slotNumber}>Slot {slot.slot}</span>
                    {slot.occupied ? (
                      <span className={styles.slotMeta}>
                        {slot.name}
                        {slot.updatedAt ? ` · updated ${new Date(slot.updatedAt).toLocaleString()}` : ""}
                        {slot.snapshotCount
                          ? ` · ${slot.snapshotCount} snapshot${slot.snapshotCount === 1 ? "" : "s"}`
                          : ""}
                      </span>
                    ) : (
                      <span className={styles.slotMeta}>Empty</span>
                    )}
                  </div>
                  <div className={styles.slotActions}>
                    {mode === "load" ? (
                      <button
                        type="button"
                        className={styles.actionButton}
                        disabled={disabled || !slot.occupied}
                        onClick={() => onSelectSlot(slot.slot)}
                      >
                        Load
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.actionButton}
                        disabled={disabled || !name.trim()}
                        onClick={() => onSelectSlot(slot.slot, name.trim())}
                      >
                        {slot.occupied ? "Overwrite" : "Save"}
                      </button>
                    )}
                    {slot.occupied && (
                      <button
                        type="button"
                        className={styles.deleteButton}
                        disabled={disabled}
                        onClick={() => onDeleteSlot(slot.slot)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
