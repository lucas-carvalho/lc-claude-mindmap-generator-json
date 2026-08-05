"use client";

import { useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { getInitials } from "@/lib/treeUtils";
import type { FlowNode } from "@/lib/treeUtils";

import { STATUS_META, StatusBadge } from "./StatusBadge";
import styles from "./TreeNodeCard.module.css";

interface TreeNodeCardProps extends NodeProps<FlowNode> {
  onStatusChange?: (status: string | undefined) => void;
}

export function TreeNodeCard({ data, selected, onStatusChange }: TreeNodeCardProps) {
  const isRoot = data.side === "root";
  const isLeft = data.side === "left";
  const [popoverOpen, setPopoverOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [popoverOpen]);

  const initials = data.assignee ? getInitials(data.assignee) : null;

  return (
    <div
      className={`${styles.card} ${isRoot ? styles.root : ""} ${selected ? styles.selected : ""}`}
      style={{ borderColor: data.branchColor, background: isRoot ? data.branchColor : undefined }}
    >
      {initials && (
        <span className={styles.avatar} title={data.assignee} style={{ backgroundColor: data.branchColor }}>
          {initials}
        </span>
      )}
      {!isRoot && <Handle type="target" position={isLeft ? Position.Right : Position.Left} />}
      <div className={styles.headerRow}>
        {data.type && <span className={styles.type}>{data.type}</span>}
        {onStatusChange ? (
          <div className={`${styles.statusWrapper} nodrag nopan`} ref={statusRef}>
            <button
              type="button"
              className={styles.statusTrigger}
              onClick={(event) => {
                event.stopPropagation();
                setPopoverOpen((open) => !open);
              }}
            >
              <StatusBadge status={data.status} placeholder="Set status" />
            </button>
            {popoverOpen && (
              <div className={styles.statusPopover}>
                <button
                  type="button"
                  className={styles.statusOption}
                  onClick={(event) => {
                    event.stopPropagation();
                    onStatusChange(undefined);
                    setPopoverOpen(false);
                  }}
                >
                  No status
                </button>
                {Object.entries(STATUS_META).map(([value, meta]) => (
                  <button
                    key={value}
                    type="button"
                    className={styles.statusOption}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStatusChange(value);
                      setPopoverOpen(false);
                    }}
                  >
                    <span className={styles.statusSwatch} style={{ backgroundColor: meta.color }} />
                    {meta.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <StatusBadge status={data.status} />
        )}
      </div>
      <div className={styles.label}>{data.label}</div>
      {isRoot ? (
        <>
          <Handle type="source" position={Position.Left} id="left" />
          <Handle type="source" position={Position.Right} id="right" />
        </>
      ) : (
        <Handle type="source" position={isLeft ? Position.Left : Position.Right} />
      )}
    </div>
  );
}
