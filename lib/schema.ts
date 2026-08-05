import { z } from "zod";
import type { TreeFile, TreeNode, TreeSnapshot } from "./types";

export const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    children: z.array(TreeNodeSchema).default([]),
  }),
);

export const TreeSnapshotSchema: z.ZodType<TreeSnapshot> = z.object({
  id: z.string().min(1),
  capturedAt: z.string(),
  root: TreeNodeSchema,
});

export const TreeFileSchema: z.ZodType<TreeFile> = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
  root: TreeNodeSchema,
  snapshots: z.array(TreeSnapshotSchema).default([]),
});

export const TreeSaveRequestSchema = z.object({
  name: z.string().min(1).max(100),
  root: TreeNodeSchema,
});
