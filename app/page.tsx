"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckCircle2, Pencil, TriangleAlert } from "lucide-react";

import { DeleteNodeConfirmModal } from "@/components/DeleteNodeConfirmModal";
import { LegendPanel } from "@/components/LegendPanel";
import { MindmapCanvas } from "@/components/MindmapCanvas";
import { PlatformTabsBar } from "@/components/PlatformTabsBar";
import { ResetConfirmModal } from "@/components/ResetConfirmModal";
import { SlotPickerModal } from "@/components/SlotPickerModal";
import { SnapshotCompareModal } from "@/components/SnapshotCompareModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toolbar } from "@/components/Toolbar";
import { sampleTree } from "@/data/sampleTree";
import { deleteSlotRequest, fetchSlot, fetchSlots, saveSlot } from "@/lib/api";
import {
  collectAllIds,
  findNodeById,
  generateChildId,
  getNodeDepth,
  getTypeLabelForDepth,
  removeNodeById,
  updateNodeById,
} from "@/lib/treeUtils";
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
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deleteConfirmNodeId, setDeleteConfirmNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const exportRef = useRef<(() => void) | null>(null);

  // Single-level (non-cumulative) undo/redo: remembers exactly one step
  // back and one forward, not a full history stack. activeTreeRef is kept
  // in sync via an effect (not a raw assignment during render, which the
  // rules-of-hooks lint rule disallows) so captureUndo always reads the
  // state as it was right before the mutation currently being applied.
  const activeTreeRef = useRef(activeTree);
  useEffect(() => {
    activeTreeRef.current = activeTree;
  });
  const [undoSnapshot, setUndoSnapshot] = useState<TreeFile | null>(null);
  const [redoSnapshot, setRedoSnapshot] = useState<TreeFile | null>(null);

  // Stable (empty deps) so it can be safely referenced from handleNodeUpdate's
  // own memoized useCallback without forcing that to recreate every render
  // (which would undo MindmapCanvas's nodeTypes stability from Part 1).
  const captureUndo = useCallback(() => {
    setUndoSnapshot(activeTreeRef.current);
    setRedoSnapshot(null);
  }, []);

  const handleUndo = () => {
    if (!undoSnapshot) return;
    setRedoSnapshot(activeTreeRef.current);
    setActiveTree(undoSnapshot);
    setUndoSnapshot(null);
    setIsDirty(true);
  };

  const handleRedo = () => {
    if (!redoSnapshot) return;
    setUndoSnapshot(activeTreeRef.current);
    setActiveTree(redoSnapshot);
    setRedoSnapshot(null);
    setIsDirty(true);
  };

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

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
    setIsDirty(false);
    // Jumping to a different tree entirely makes the old undo/redo pair
    // meaningless rather than something to undo itself.
    setUndoSnapshot(null);
    setRedoSnapshot(null);
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

  const handleConfirmReset = () => {
    captureUndo();
    setActiveTree((prev) => ({
      ...prev,
      platforms: prev.platforms.map((p) =>
        p.id === viewedPlatformId
          ? { ...p, root: structuredClone(sampleTree.platforms[0].root) }
          : p,
      ),
    }));
    setIsDirty(true);
    setResetConfirmOpen(false);
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
          orphans: [],
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
    if (trimmed && trimmed !== activeTree.name) {
      captureUndo();
      setActiveTree((prev) => ({ ...prev, name: trimmed }));
      setIsDirty(true);
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
        platforms: activeTree.platforms.map(({ id, name: platformName, root, orphans }) => ({
          id,
          name: platformName,
          root,
          orphans,
        })),
      });
      applyTree(saved);
      setActiveSlot(slot);
      setIsDirty(false);
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
    captureUndo();
    setActiveTree((prev) => ({
      ...prev,
      platforms: prev.platforms.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
    setIsDirty(true);
  };

  const handleDuplicatePlatform = () => {
    captureUndo();
    const newPlatform: PlatformInstance = {
      id: crypto.randomUUID(),
      name: `${activePlatform.name} copy`,
      root: structuredClone(activePlatform.root),
      orphans: structuredClone(activePlatform.orphans),
      snapshots: [],
    };
    setActiveTree((prev) => ({ ...prev, platforms: [...prev.platforms, newPlatform] }));
    setViewedPlatformId(newPlatform.id);
    setIsDirty(true);
  };

  const handleNodeUpdate = useCallback(
    (currentId: string, patch: Partial<TreeNode>) => {
      captureUndo();
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
      setIsDirty(true);
    },
    [viewedPlatformId, captureUndo],
  );

  const handleAddChildNode = (parentId: string) => {
    captureUndo();
    const existingIds = collectAllIds(activePlatform.root);
    const childType = getTypeLabelForDepth(getNodeDepth(activePlatform.root, parentId) + 1);
    const newId = generateChildId(parentId, "New node", childType, existingIds);
    const newNode: TreeNode = { id: newId, label: "New node", type: childType, children: [] };
    setActiveTree((prev) => ({
      ...prev,
      platforms: prev.platforms.map((p) =>
        p.id === viewedPlatformId
          ? {
              ...p,
              root: updateNodeById(p.root, parentId, (node) => ({
                ...node,
                children: [...node.children, newNode],
              })),
            }
          : p,
      ),
    }));
    setSelectedNodeId(newId);
    setIsDirty(true);
  };

  const handleDeletePlatform = (id: string) => {
    if (activeTree.platforms.length <= 1) return;
    captureUndo();
    const platforms = activeTree.platforms.filter((p) => p.id !== id);
    const nextViewedId = viewedPlatformId === id ? platforms[0].id : viewedPlatformId;
    setActiveTree((prev) => ({
      ...prev,
      platforms,
      activePlatformId: prev.activePlatformId === id ? platforms[0].id : prev.activePlatformId,
    }));
    setViewedPlatformId(nextViewedId);
    setIsDirty(true);
  };

  const handleDeleteNode = (nodeId: string) => {
    captureUndo();
    setActiveTree((prev) => ({
      ...prev,
      platforms: prev.platforms.map((p) => {
        if (p.id !== viewedPlatformId) return p;

        const orphanIndex = p.orphans.findIndex((orphan) => orphan.id === nodeId);
        if (orphanIndex !== -1) {
          const removed = p.orphans[orphanIndex];
          const remaining = p.orphans.filter((_, index) => index !== orphanIndex);
          return { ...p, orphans: [...remaining, ...removed.children] };
        }

        const result = removeNodeById(p.root, nodeId);
        if (!result) return p; // e.g. attempted delete of the true root
        return { ...p, root: result.tree, orphans: [...p.orphans, ...result.removedChildren] };
      }),
    }));
    setSelectedNodeId(null);
    setDeleteConfirmNodeId(null);
    setIsDirty(true);
  };

  const deleteTargetNode = deleteConfirmNodeId
    ? (findNodeById(activePlatform.root, deleteConfirmNodeId) ??
      activePlatform.orphans
        .map((orphan) => findNodeById(orphan, deleteConfirmNodeId))
        .find((found) => found) ??
      null)
    : null;

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
        <div className={styles.headerToolbar}>
          <Toolbar
            onOpenSave={() => openModal("save")}
            onOpenLoad={() => openModal("load")}
            onOpenCompare={() => setCompareOpen(true)}
            onOpenReset={() => setResetConfirmOpen(true)}
            onUploadTree={handleUploadTree}
            onNewTree={handleNewTree}
            onToggleLegend={() => setLegendOpen((open) => !open)}
            onExport={() => exportRef.current?.()}
            onUndo={handleUndo}
            onRedo={handleRedo}
            undoDisabled={!undoSnapshot}
            redoDisabled={!redoSnapshot}
          />
        </div>
        <div className={styles.headerRight}>
          {isDirty ? (
            <span className={styles.unsavedBadge}>
              <TriangleAlert size={12} />
              Unsaved changes
            </span>
          ) : activeSlot ? (
            <span className={styles.savedBadge}>
              <CheckCircle2 size={12} />
              Saved to Slot {activeSlot}
            </span>
          ) : (
            <span className={styles.unsavedBadge}>
              <TriangleAlert size={12} />
              Sample tree — not saved
            </span>
          )}
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
        <MindmapCanvas
          root={activePlatform.root}
          orphans={activePlatform.orphans}
          treeName={activeTree.name}
          colorMode={theme}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onNodeUpdate={handleNodeUpdate}
          onAddChild={handleAddChildNode}
          onRequestDeleteNode={setDeleteConfirmNodeId}
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
      {resetConfirmOpen && (
        <ResetConfirmModal
          platformName={activePlatform.name}
          onConfirm={handleConfirmReset}
          onClose={() => setResetConfirmOpen(false)}
        />
      )}
      {deleteConfirmNodeId && deleteTargetNode && (
        <DeleteNodeConfirmModal
          nodeLabel={deleteTargetNode.label}
          childCount={deleteTargetNode.children.length}
          onConfirm={() => handleDeleteNode(deleteConfirmNodeId)}
          onClose={() => setDeleteConfirmNodeId(null)}
        />
      )}
    </div>
  );
}
