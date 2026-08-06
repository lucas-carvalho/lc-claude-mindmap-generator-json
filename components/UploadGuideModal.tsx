"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import styles from "./UploadGuideModal.module.css";

interface UploadGuideModalProps {
  onClose: () => void;
}

const TEMPLATE_JSON = `{
  "schemaVersion": 2,
  "id": "my-tree",
  "name": "My Regression Suite",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "activePlatformId": "default",
  "platforms": [
    {
      "id": "default",
      "name": "Default",
      "orphans": [],
      "snapshots": [],
      "root": {
        "id": "root",
        "label": "My Regression Suite",
        "children": [
          {
            "id": "feature-example",
            "label": "Example feature",
            "children": [
              {
                "id": "scenario-example",
                "label": "Example scenario",
                "children": [
                  {
                    "id": "tc-example-happy-path",
                    "label": "Example test case",
                    "status": "not-run",
                    "notes": "Optional free-text notes.",
                    "assignee": "Optional full name",
                    "metadata": { "ticket": "OPTIONAL-123" },
                    "children": []
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  ]
}`;

export function UploadGuideModal({ onClose }: UploadGuideModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(TEMPLATE_JSON).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Upload format guide</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className={styles.intro}>
          Upload expects a JSON file shaped like the template below. Copy it as a starting point — hand
          it to an AI assistant, or edit it directly — then upload the result.
        </p>

        <ul className={styles.fieldList}>
          <li>
            <code>id</code> — unique string per node
          </li>
          <li>
            <code>label</code> — display text
          </li>
          <li>
            <code>status</code> — one of passed/failed/blocked/pending/not-run (optional)
          </li>
          <li>
            <code>notes</code>, <code>assignee</code> — free text (optional)
          </li>
          <li>
            <code>metadata</code> — free-form key/value pairs (optional)
          </li>
          <li>
            <code>children</code> — array of nodes with this same shape (required, can be empty)
          </li>
          <li>
            <code>type</code> is deliberately omitted — it&apos;s computed automatically from a node&apos;s
            position in the tree, not something you author
          </li>
          <li>
            <code>orphans</code> is optional and auto-managed by the app (detached nodes) — leave it as{" "}
            <code>[]</code>
          </li>
        </ul>

        <div className={styles.codeBlockWrapper}>
          <button type="button" className={styles.copyButton} onClick={handleCopy}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <pre className={styles.codeBlock}>{TEMPLATE_JSON}</pre>
        </div>
      </div>
    </div>
  );
}
