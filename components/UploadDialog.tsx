"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { TreeFileSchema } from "@/lib/schema";
import type { TreeFile } from "@/lib/types";

import styles from "./UploadDialog.module.css";

interface UploadDialogProps {
  onLoad: (tree: TreeFile) => void;
}

export function UploadDialog({ onLoad }: UploadDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    try {
      const text = await file.text();
      const result = TreeFileSchema.safeParse(JSON.parse(text));
      if (!result.success) {
        setError("This file doesn't match the expected tree format.");
        return;
      }
      onLoad(result.data);
    } catch {
      setError("Couldn't read that file as JSON.");
    }
  };

  return (
    <span className={styles.wrapper}>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className={styles.hiddenInput}
        onChange={(event) => void handleFileChange(event)}
      />
      <button type="button" className={styles.button} onClick={() => inputRef.current?.click()}>
        Upload
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </span>
  );
}
