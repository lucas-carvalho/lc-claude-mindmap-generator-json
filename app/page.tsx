"use client";

import { useCallback, useState } from "react";

import { MindmapCanvas } from "@/components/MindmapCanvas";
import { SlotPickerModal } from "@/components/SlotPickerModal";
import { Toolbar } from "@/components/Toolbar";
import { sampleTree } from "@/data/sampleTree";
import { deleteSlotRequest, fetchSlot, fetchSlots, saveSlot } from "@/lib/api";
import type { TreeFile, TreeSlot, TreeSlotSummary } from "@/lib/types";

import styles from "./page.module.css";

type ModalMode = "load" | "save" | null;

export default function Home() {
  const [activeTree, setActiveTree] = useState<TreeFile>(sampleTree);
  const [activeSlot, setActiveSlot] = useState<TreeSlot | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [slots, setSlots] = useState<TreeSlotSummary[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      setSlots(await fetchSlots());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slots");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  const openModal = (mode: Exclude<ModalMode, null>) => {
    setError(null);
    setModalMode(mode);
    void refreshSlots();
  };

  const handleResetSample = () => {
    setActiveTree(sampleTree);
    setActiveSlot(null);
  };

  const handleLoadSlot = async (slot: TreeSlot) => {
    try {
      const file = await fetchSlot(slot);
      setActiveTree(file);
      setActiveSlot(slot);
      setModalMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slot");
    }
  };

  const handleSaveSlot = async (slot: TreeSlot, name?: string) => {
    try {
      const saved = await saveSlot(slot, { name: name ?? activeTree.name, root: activeTree.root });
      setActiveTree(saved);
      setActiveSlot(slot);
      setModalMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save slot");
    }
  };

  const handleUploadTree = (tree: TreeFile) => {
    setError(null);
    setActiveTree(tree);
    setActiveSlot(null);
  };

  const handleDeleteSlot = async (slot: TreeSlot) => {
    try {
      await deleteSlotRequest(slot);
      if (activeSlot === slot) setActiveSlot(null);
      await refreshSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete slot");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{activeTree.name}</h1>
        <div className={styles.headerRight}>
          <span className={styles.slotBadge}>
            {activeSlot ? `Slot ${activeSlot}` : "Sample tree (not saved)"}
          </span>
          <Toolbar
            onOpenSave={() => openModal("save")}
            onOpenLoad={() => openModal("load")}
            onResetSample={handleResetSample}
            onUploadTree={handleUploadTree}
          />
        </div>
      </header>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.canvasArea}>
        <MindmapCanvas root={activeTree.root} />
      </div>
      {modalMode && (
        <SlotPickerModal
          mode={modalMode}
          slots={slots}
          loading={slotsLoading}
          defaultName={activeTree.name}
          onClose={() => setModalMode(null)}
          onSelectSlot={(slot, name) => {
            if (modalMode === "save") void handleSaveSlot(slot, name);
            else void handleLoadSlot(slot);
          }}
          onDeleteSlot={handleDeleteSlot}
        />
      )}
    </div>
  );
}
