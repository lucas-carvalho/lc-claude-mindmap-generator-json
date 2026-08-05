# Mindmap Generator JSON by LC

A local, single-user prototype that renders a fixed-template mindmap
visualization over abstracted, generic tree data — the kind of thing you'd
use to visualize a hierarchy of features → scenarios → test cases with a
pass/fail-style status per node.

There is no database and no server-side integration with anything beyond
this app's own filesystem: trees are plain JSON, and persistence is a
handful of local API routes reading/writing `data/trees/*.json`.

## What it does

- Renders a tree (`root` node with nested `children`) as an interactive
  mindmap using React Flow, laid out automatically with `dagre` every time
  a tree loads — the layout algorithm and node styling are the "fixed
  template"; only the data changes.
- Ships with one bundled **sample tree** that's always available and never
  counts as a saved slot on its own.
- Supports **up to 5 independent, persisted trees** ("slots"): save the
  current tree into any slot, load a previously saved slot, or delete one.
- Supports **uploading** a tree from an external `.json` file (validated
  client-side against the same schema the API uses) without touching the
  server at all.
- Tracks a **snapshot history per slot**: saving over an already-occupied
  slot pushes its previous state into that slot's own history (capped at
  10 versions), and you can compare any two versions of the *same* tree to
  see what changed — never across two different trees.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Data model

Every tree is a `TreeFile` (see [`lib/types.ts`](lib/types.ts) and the
matching [`lib/schema.ts`](lib/schema.ts) zod validation):

```ts
interface TreeNode {
  id: string;
  label: string;
  type?: string;       // e.g. "feature" | "scenario" | "testcase" | "group"
  status?: string;      // e.g. "passed" | "failed" | "blocked" | "pending" | "not-run"
  notes?: string;
  metadata?: Record<string, string>;
  children: TreeNode[];
}

interface TreeFile {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  root: TreeNode;
  snapshots: TreeSnapshot[]; // this slot's own version history
}
```

## Verification

This project is checked with:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

The persistence and diff logic were also verified directly (not just by
type-checking): `curl` against the running dev server for the `/api/trees`
routes (save/load/delete, snapshot-on-save, invalid input), and a standalone
script run through `tsx` for `lib/treeDiff.ts`'s added/removed/changed
classification.

## Where this can't go as-is

This is a local prototype by design — no accounts, no database, no network
hardening. [`docs/PRODUCTIONIZING.md`](docs/PRODUCTIONIZING.md) lays out,
generically, what a real hosted/multi-user version would still need.
