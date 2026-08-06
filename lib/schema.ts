import { z } from "zod";
import type { PlatformInstance, TreeFile, TreeNode, TreeSnapshot } from "./types";
import { MAX_PLATFORMS_PER_SLOT } from "./types";

export const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
    assignee: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    children: z.array(TreeNodeSchema).default([]),
  }),
);

export const TreeSnapshotSchema: z.ZodType<TreeSnapshot> = z.object({
  id: z.string().min(1),
  capturedAt: z.string(),
  root: TreeNodeSchema,
  orphans: z.array(TreeNodeSchema).default([]),
});

export const PlatformInstanceSchema: z.ZodType<PlatformInstance> = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  root: TreeNodeSchema,
  orphans: z.array(TreeNodeSchema).default([]),
  snapshots: z.array(TreeSnapshotSchema).default([]),
});

export const TreeFileSchema: z.ZodType<TreeFile> = z.object({
  schemaVersion: z.literal(2),
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
  platforms: z.array(PlatformInstanceSchema).min(1).max(MAX_PLATFORMS_PER_SLOT),
  activePlatformId: z.string().min(1),
});

export const PlatformSaveInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  root: TreeNodeSchema,
  orphans: z.array(TreeNodeSchema).default([]),
});

export const TreeSaveRequestSchema = z.object({
  name: z.string().min(1).max(100),
  activePlatformId: z.string().min(1),
  platforms: z.array(PlatformSaveInputSchema).min(1).max(MAX_PLATFORMS_PER_SLOT),
});
