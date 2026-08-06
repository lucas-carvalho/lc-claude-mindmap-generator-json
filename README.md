# Mindmap Generator JSON by LC

A local, single-user prototype that renders a fixed-template mindmap
visualization over abstracted, generic tree data — the kind of thing you'd
use to visualize a hierarchy of features → scenarios → test cases with a
pass/fail-style status per node.

There is no database and no server-side integration with anything beyond
this app's own filesystem: trees are plain JSON, and persistence is a
handful of local API routes reading/writing `data/trees/*.json`.

## What it does

- Renders a tree (`root` node with nested `children`) as an interactive,
  Mindmeister-style radial mindmap using React Flow, laid out automatically
  with `d3-hierarchy` every time a tree loads — the layout algorithm and node
  styling are the "fixed template"; only the data changes.
- Ships with one bundled **sample tree** that's always available and never
  counts as a saved slot on its own.
- Supports **up to 5 independent, persisted trees** ("slots"), and each tree
  can hold up to 3 **platform** instances — independent duplicated copies of
  the same tree (e.g. one per device/OS) switchable via tabs. Save the
  current tree into any slot, load a previously saved slot, or delete one.
- Supports **uploading** a tree from an external `.json` file (validated
  client-side against the same schema the API uses) without touching the
  server at all — an in-app format guide gives a copyable minimal JSON
  template for hand-authoring or prompting an AI to generate one.
- Tracks a **snapshot history per platform** (capped at 10 versions): saving
  over an already-occupied slot pushes each platform's previous state into
  that platform's own history, and you can compare any two versions of the
  *same* platform to see what changed.
- Full **node editing** via a draggable properties panel: label, id
  (auto-synced to the label unless manually customized), status, assignee
  (with an avatar and quick inline edit), notes, and free-form metadata
  key/value pairs. A node's **type** (Suite/Feature/Scenario/Test case) is
  computed automatically from its depth in the tree, not manually set.
- **Add child nodes** and **delete nodes** — from the panel or the keyboard
  Delete/Backspace key — both behind a confirmation dialog. Deleting a node
  keeps its own children visible as detached "unlinked" subtrees instead of
  removing them, until they're reconnected (not yet supported) or deleted.
- Single-level **Undo/Redo** for the last action.
- Light/dark **theme toggle**, **SVG export** of the whole diagram, and a
  non-interactive **Legend** explaining the diagram's structure/status/
  assignment conventions.
- **Reset** restores the bundled sample data for one platform at a time,
  behind a dialog requiring you to type that platform's name to confirm.

## Key dependencies

- [`next`](https://nextjs.org/) 16 (App Router) + `react`/`react-dom` 19 — app framework and UI.
- [`@xyflow/react`](https://reactflow.dev/) — the interactive canvas (nodes, edges, drag, minimap, controls).
- [`d3-hierarchy`](https://github.com/d3/d3-hierarchy) — computes node positions for the radial layout.
- [`zod`](https://zod.dev/) — schema validation for every tree, shared by the client and the API routes.
- [`lucide-react`](https://lucide.dev/) — icons throughout the toolbar/panels.
- [`html-to-image`](https://github.com/bubkoo/html-to-image) — powers the SVG export.
- `next/font/google` (Geist + Sora, no extra dependency) — the app's two typefaces.

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
  type?: string;        // computed from depth (suite/feature/scenario/test case), not authored
  status?: string;       // e.g. "passed" | "failed" | "blocked" | "pending" | "not-run"
  notes?: string;
  assignee?: string;
  metadata?: Record<string, string>; // free-form key/value pairs
  children: TreeNode[];
}

interface PlatformInstance {
  id: string;
  name: string;
  root: TreeNode;
  orphans: TreeNode[];       // subtrees detached by a delete, no path back to root
  snapshots: TreeSnapshot[]; // this platform's own version history
}

interface TreeFile {
  schemaVersion: 2;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  platforms: PlatformInstance[]; // up to 3 per tree
  activePlatformId: string;
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
generically, what a real hosted/multi-user version would still need. See
[`SECURITY.md`](SECURITY.md) for how to report a vulnerability and what this
project's security posture actually is today.

## License

[MIT](LICENSE)
