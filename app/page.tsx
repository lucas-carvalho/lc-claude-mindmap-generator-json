"use client";

import { useState } from "react";

import { sampleTree } from "@/data/sampleTree";
import type { TreeFile, TreeSlot } from "@/lib/types";

import styles from "./page.module.css";

export default function Home() {
  const [activeTree] = useState<TreeFile>(sampleTree);
  const [activeSlot] = useState<TreeSlot | null>(null);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{activeTree.name}</h1>
        <span className={styles.slotBadge}>
          {activeSlot ? `Slot ${activeSlot}` : "Sample tree (not saved)"}
        </span>
      </header>
      <div className={styles.canvasArea}>
        <div className={styles.canvasPlaceholder}>Mindmap canvas coming up next.</div>
      </div>
    </div>
  );
}
