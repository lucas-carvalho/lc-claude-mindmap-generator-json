"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { LegendPanel } from "@/components/LegendPanel";
import { MindmapCanvas } from "@/components/MindmapCanvas";
import { PlatformTabsBar } from "@/components/PlatformTabsBar";
import { SlotPickerModal } from "@/components/SlotPickerModal";
import { SnapshotCompareModal } from "@/components/SnapshotCompareModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toolbar } from "@/components/Toolbar";
import { sampleTree } from "@/data/sampleTree";
import { deleteSlotRequest, fetchSlot, fetchSlots, saveSlot } from "@/lib/api";
import { updateNodeById } from "@/lib/treeUtils";
import type { PlatformInstance, TreeFile, TreeNode, TreeSlot, TreeSlotSummary } from "@/lib/types";

import styles from "./page.module.css";

type ModalMode = "load" | "save" | null;

export default function Home() {
  const [activeTree, setActiveTree] = useState<TreeFile>(sampleTree);
  const [viewedPlatformId, setViewedPlatformId] = useState(sampleTree.activePlatformId);
  const [activeSlot, setActiveSlot] = useState<TreeSlot | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [slots, setSlots] = useState<TreeSlotSummary[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [renamingTree, setRenamingTree] = useState(false);
  const [treeNameDraft, setTreeNameDraft] = useState("");
  const exportRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    // Re-derives from the same source the pre-hydration script in
    // layout.tsx reads, and re-applies the attribute — React's dev-mode
    // Strict Mode remount clears attributes it doesn't manage from JSX,
    // which would otherwise silently drop the script's work.
    const stored = localStorage.getItem("theme");
    const resolved: "light" | "dark" =
      stored === "dark" || stored === "light"
        ? stored
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.setAttribute("data-theme", resolved);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external system (localStorage/matchMedia), not from props
    setTheme(resolved);
  }, []);

  const toggleTheme = () => {
    const next: "light" | "dark" = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

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

  const handleNewTree = () => {
    const now = new Date().toISOString();
    const platformId = crypto.randomUUID();
    const newTree: TreeFile = {
      schemaVersion: 2,
      id: crypto.randomUUID(),
      name: "Untitled tree",
      createdAt: now,
      updatedAt: now,
      platforms: [
        {
          id: platformId,
          name: "Default",
          root: { id: crypto.randomUUID(), label: "Untitled tree", children: [] },
          snapshots: [],
        },
      ],
      activePlatformId: platformId,
    };
    applyTree(newTree);
    setActiveSlot(null);
    setSelectedNodeId(null);
  };

  const startRenamingTree = () => {
    setTreeNameDraft(activeTree.name);
    setRenamingTree(true);
  };

  const commitTreeName = () => {
    const trimmed = treeNameDraft.trim();
    if (trimmed) {
      setActiveTree((prev) => ({ ...prev, name: trimmed }));
    }
    setRenamingTree(false);
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

  const handleNodeUpdate = useCallback(
    (currentId: string, patch: Partial<TreeNode>) => {
      setActiveTree((prev) => ({
        ...prev,
        platforms: prev.platforms.map((p) =>
          p.id === viewedPlatformId
            ? { ...p, root: updateNodeById(p.root, currentId, (node) => ({ ...node, ...patch })) }
            : p,
        ),
      }));
      if (patch.id && patch.id !== currentId) {
        setSelectedNodeId(patch.id);
      }
    },
    [viewedPlatformId],
  );

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
        {renamingTree ? (
          <input
            autoFocus
            className={styles.titleInput}
            value={treeNameDraft}
            onChange={(event) => setTreeNameDraft(event.target.value)}
            onBlur={commitTreeName}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitTreeName();
              if (event.key === "Escape") setRenamingTree(false);
            }}
          />
        ) : (
          <button type="button" className={styles.titleButton} onClick={startRenamingTree}>
            <h1 className={styles.titleText}>{activeTree.name}</h1>
            <Pencil size={14} />
          </button>
        )}
        <div className={styles.headerRight}>
          <span className={styles.slotBadge}>
            {activeSlot ? `Slot ${activeSlot}` : "Sample tree (not saved)"}
          </span>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      <p className={styles.platformCaption}>
        Platforms — independent copies of this tree (e.g. per device or OS)
      </p>
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
        <Toolbar
          onOpenSave={() => openModal("save")}
          onOpenLoad={() => openModal("load")}
          onOpenCompare={() => setCompareOpen(true)}
          onResetSample={handleResetSample}
          onUploadTree={handleUploadTree}
          onNewTree={handleNewTree}
          onToggleLegend={() => setLegendOpen((open) => !open)}
          onExport={() => exportRef.current?.()}
        />
        <MindmapCanvas
          root={activePlatform.root}
          treeName={activeTree.name}
          colorMode={theme}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onNodeUpdate={handleNodeUpdate}
          exportRef={exportRef}
        />
        <LegendPanel open={legendOpen} onClose={() => setLegendOpen(false)} />
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
