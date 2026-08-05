import styles from "./StatusBadge.module.css";

export const STATUS_META: Record<string, { color: string; label: string }> = {
  passed: { color: "#16a34a", label: "Passed" },
  failed: { color: "#dc2626", label: "Failed" },
  blocked: { color: "#d97706", label: "Blocked" },
  pending: { color: "#2563eb", label: "Pending" },
  "not-run": { color: "#6b7280", label: "Not run" },
};

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const meta = STATUS_META[status] ?? { color: "#6b7280", label: status };

  return (
    <span className={styles.badge} style={{ backgroundColor: meta.color }}>
      {meta.label}
    </span>
  );
}
