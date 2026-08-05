"use client";

import { useCallback, useState } from "react";

import { MindmapCanvas } from "@/components/MindmapCanvas";
import { PlatformTabsBar } from "@/components/PlatformTabsBar";
import { SlotPickerModal } from "@/components/SlotPickerModal";
import { SnapshotCompareModal } from "@/components/SnapshotCompareModal";
import { Toolbar } from "@/components/Toolbar";
import { sampleTree } from "@/data/sampleTree";
import { deleteSlotRequest, fetchSlot, fetchSlots, saveSlot } from "@/lib/api";
import type { PlatformInstance, TreeFile, TreeSlot, TreeSlotSummary } from "@/lib/types";

import styles from "./page.module.css";

type ModalMode = "load" | "save" | null;

export default function Home() {
  const [activeTree, setActiveTree] = useState<TreeFile>(sampleTree);
  const [viewedPlatformId, setViewedPlatformId] = useState(sampleTree.activePlatformId);
  const [activeSlot, setActiveSlot] = useState<TreeSlot | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [slots, setSlots] = useState<TreeSlotSummary[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePlatform =
    activeTree.platforms.find((p) => p.id === viewedPlatformId) ?? activeTree.platforms[0];

  const applyTree = (tree: TreeFile) => {
    setActiveTree(tree);
    setViewedPlatformId(tree.activePlatformId);
  };

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
    applyTree(sampleTree);
    setActiveSlot(null);
  };

  const handleLoadSlot = async (slot: TreeSlot) => {
    setActionPending(true);
    try {
      const file = await fetchSlot(slot);
      applyTree(file);
      setActiveSlot(slot);
      setModalMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slot");
    } finally {
      setActionPending(false);
    }
  };

  const handleSaveSlot = async (slot: TreeSlot, name?: string) => {
    setActionPending(true);
    try {
      const saved = await saveSlot(slot, {
        name: name ?? activeTree.name,
        activePlatformId: viewedPlatformId,
        platforms: activeTree.platforms.map(({ id, name: platformName, root }) => ({
          id,
          name: platformName,
          root,
        })),
      });
      applyTree(saved);
      setActiveSlot(slot);
      setModalMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save slot");
    } finally {
      setActionPending(false);
    }
  };

  const handleUploadTree = (tree: TreeFile) => {
    setError(null);
    applyTree(tree);
    setActiveSlot(null);
  };

  const handleDeleteSlot = async (slot: TreeSlot) => {
    setActionPending(true);
    try {
      await deleteSlotRequest(slot);
      if (activeSlot === slot) setActiveSlot(null);
      await refreshSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete slot");
    } finally {
      setActionPending(false);
    }
  };

  const handleSwitchPlatform = (id: string) => {
    setViewedPlatformId(id);
  };

  const handleRenamePlatform = (id: string, name: string) => {
    setActiveTree((prev) => ({
      ...prev,
      platforms: prev.platforms.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  };

  const handleDuplicatePlatform = () => {
    const newPlatform: PlatformInstance = {
      id: crypto.randomUUID(),
      name: `${activePlatform.name} copy`,
      root: structuredClone(activePlatform.root),
      snapshots: [],
    };
    setActiveTree((prev) => ({ ...prev, platforms: [...prev.platforms, newPlatform] }));
    setViewedPlatformId(newPlatform.id);
  };

  const handleDeletePlatform = (id: string) => {
    if (activeTree.platforms.length <= 1) return;
    const platforms = activeTree.platforms.filter((p) => p.id !== id);
    const nextViewedId = viewedPlatformId === id ? platforms[0].id : viewedPlatformId;
    setActiveTree((prev) => ({
      ...prev,
      platforms,
      activePlatformId: prev.activePlatformId === id ? platforms[0].id : prev.activePlatformId,
    }));
    setViewedPlatformId(nextViewedId);
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
            onOpenCompare={() => setCompareOpen(true)}
            onResetSample={handleResetSample}
            onUploadTree={handleUploadTree}
          />
        </div>
      </header>
      <PlatformTabsBar
        platforms={activeTree.platforms}
        viewedPlatformId={activePlatform.id}
        onSwitch={handleSwitchPlatform}
        onRename={handleRenamePlatform}
        onDuplicate={handleDuplicatePlatform}
        onDelete={handleDeletePlatform}
      />
      {error && (
        <p className={styles.error}>
          {error}
          <button type="button" className={styles.errorDismiss} onClick={() => setError(null)}>
            Dismiss
          </button>
        </p>
      )}
      <div className={styles.canvasArea}>
        <MindmapCanvas root={activePlatform.root} />
      </div>
      {modalMode && (
        <SlotPickerModal
          mode={modalMode}
          slots={slots}
          loading={slotsLoading}
          disabled={actionPending}
          defaultName={activeTree.name}
          onClose={() => setModalMode(null)}
          onSelectSlot={(slot, name) => {
            if (modalMode === "save") void handleSaveSlot(slot, name);
            else void handleLoadSlot(slot);
          }}
          onDeleteSlot={handleDeleteSlot}
        />
      )}
      {compareOpen && (
        <SnapshotCompareModal
          tree={activeTree}
          initialPlatformId={activePlatform.id}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}
