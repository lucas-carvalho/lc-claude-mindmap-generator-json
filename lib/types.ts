export const MAX_SNAPSHOTS_PER_SLOT = 10;
export const TREE_SLOT_COUNT = 5;
export const MAX_PLATFORMS_PER_SLOT = 3;
export type TreeSlot = 1 | 2 | 3 | 4 | 5;

export interface TreeNode {
  id: string;
  label: string;
  type?: string;
  status?: string;
  notes?: string;
  assignee?: string;
  metadata?: Record<string, string>;
  children: TreeNode[];
}

export interface TreeSnapshot {
  id: string;
  capturedAt: string;
  root: TreeNode;
}

export interface PlatformInstance {
  id: string;
  name: string;
  root: TreeNode;
  snapshots: TreeSnapshot[];
}

export interface TreeFile {
  schemaVersion: 2;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  platforms: PlatformInstance[];
  activePlatformId: string;
}

export interface TreeSlotSummary {
  slot: TreeSlot;
  occupied: boolean;
  name?: string;
  updatedAt?: string;
  platformCount?: number;
  snapshotCount?: number;
}
