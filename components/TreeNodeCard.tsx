"use client";

import { useEffect, useRef, useState } from "react";
import { CircleUserRound } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { getAssigneeColor, getInitials } from "@/lib/treeUtils";
import type { FlowNode } from "@/lib/treeUtils";

import { STATUS_META, StatusBadge } from "./StatusBadge";
import styles from "./TreeNodeCard.module.css";

interface TreeNodeCardProps extends NodeProps<FlowNode> {
  onStatusChange?: (status: string | undefined) => void;
  onAssigneeChange?: (assignee: string | undefined) => void;
}

export function TreeNodeCard({ data, selected, onStatusChange, onAssigneeChange }: TreeNodeCardProps) {
  const isRoot = data.side === "root";
  const isLeft = data.side === "left";

  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [assigneeDraft, setAssigneeDraft] = useState(data.assignee ?? "");
  const assigneeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusPopoverOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [statusPopoverOpen]);

  useEffect(() => {
    if (!assigneePopoverOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
        setAssigneePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [assigneePopoverOpen]);

  const initials = data.assignee ? getInitials(data.assignee) : null;
  const avatarColor = data.assignee ? getAssigneeColor(data.assignee) : undefined;

  const openAssigneePopover = () => {
    setAssigneeDraft(data.assignee ?? "");
    setAssigneePopoverOpen(true);
  };

  const commitAssignee = () => {
    onAssigneeChange?.(assigneeDraft.trim() || undefined);
    setAssigneePopoverOpen(false);
  };

  const avatarContent = initials ? (
    <span className={styles.avatar} style={{ backgroundColor: avatarColor }}>
      {initials}
    </span>
  ) : (
    <span className={styles.avatarPlaceholder}>
      <CircleUserRound size={16} />
    </span>
  );

  return (
    <div
      className={`${styles.card} ${isRoot ? styles.root : ""} ${selected ? styles.selected : ""}`}
      style={{ borderColor: data.branchColor, background: isRoot ? data.branchColor : undefined }}
    >
      {onAssigneeChange ? (
        <div className={`${styles.avatarWrapper} nodrag nopan`} ref={assigneeRef}>
          <button
            type="button"
            className={styles.avatarTrigger}
            title={data.assignee || "No assignee"}
            onClick={(event) => {
              event.stopPropagation();
              if (assigneePopoverOpen) setAssigneePopoverOpen(false);
              else openAssigneePopover();
            }}
          >
            {avatarContent}
          </button>
          {assigneePopoverOpen && (
            <div className={styles.assigneePopover}>
              <label className={styles.assigneeLabel}>
                Assignee
                <input
                  autoFocus
                  className={styles.assigneeInput}
                  value={assigneeDraft}
                  onChange={(event) => setAssigneeDraft(event.target.value)}
                  onBlur={commitAssignee}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitAssignee();
                    if (event.key === "Escape") setAssigneePopoverOpen(false);
                  }}
                />
              </label>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.avatarWrapper}>{avatarContent}</div>
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
                setStatusPopoverOpen((open) => !open);
              }}
            >
              <StatusBadge status={data.status} placeholder="Set status" />
            </button>
            {statusPopoverOpen && (
              <div className={styles.statusPopover}>
                <button
                  type="button"
                  className={styles.statusOption}
                  onClick={(event) => {
                    event.stopPropagation();
                    onStatusChange(undefined);
                    setStatusPopoverOpen(false);
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
                      setStatusPopoverOpen(false);
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
