"use client";

import { STATUS_META } from "./StatusBadge";
import styles from "./LegendPanel.module.css";

interface LegendPanelProps {
  open: boolean;
  onClose: () => void;
}

export function LegendPanel({ open, onClose }: LegendPanelProps) {
  return (
    <aside className={`${styles.panel} ${open ? styles.open : ""}`} aria-hidden={!open}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Legend</h2>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close legend">
          ×
        </button>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Diagram structure</h3>
        <ul className={styles.list}>
          <li>The filled pill at the center is the tree&apos;s root.</li>
          <li>Each branch gets its own color purely to group it visually — the color itself has no meaning.</li>
          <li>Curved lines connect a node to its children.</li>
          <li>Drag any node to rearrange it; the layout only resets when the tree&apos;s actual shape changes.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Execution Status</h3>
        <ul className={styles.list}>
          {Object.entries(STATUS_META).map(([value, meta]) => (
            <li key={value} className={styles.statusRow}>
              <span className={styles.statusSwatch} style={{ backgroundColor: meta.color }} />
              {meta.label}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Assignment Rules</h3>
        <ul className={styles.list}>
          <li>A node&apos;s Assignee is a free-text name set in its edit panel.</li>
          <li>The small circular badge on a card shows initials derived automatically from that name.</li>
          <li>Assignment travels with the tree — it&apos;s saved and shared the same way as any other node data.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Step-by-step</h3>
        <ol className={styles.orderedList}>
          <li>Click a node to view or edit it.</li>
          <li>Click a node&apos;s status badge for a quick change, without opening the full panel.</li>
          <li>Drag nodes to rearrange the layout.</li>
          <li>Duplicate a platform tab to branch a per-device or per-OS variant.</li>
          <li>Use Compare versions to diff a tab against its own saved history.</li>
          <li>Save persists the current tab set to one of the 5 slots.</li>
          <li>Export saves the diagram as an SVG file.</li>
        </ol>
      </section>
    </aside>
  );
}
