import { STATUS_META } from "@/components/StatusBadge";

import { layoutTree, NODE_HEIGHT, NODE_WIDTH } from "./treeLayout";
import { ROOT_COLOR } from "./treeUtils";
import type { FlowEdge, FlowNode } from "./treeUtils";
import type { TreeNode } from "./types";

// Always a portable, widely-available font stack — this file is opened
// outside the app (any viewer, any machine), so it can't rely on the
// app's own Geist/Sora fonts being installed wherever it's viewed.
const FONT = "Arial, Helvetica, sans-serif";
const LABEL_COLOR = "#171717";
const MUTED_COLOR = "#6b7280";
const DIVIDER_COLOR = "#e5e7eb";
const CARD_RADIUS = 12;
const HEADER_HEIGHT = 150;
const PADDING = 60;

export interface BuildTreeReportSvgParams {
  treeName: string;
  platformName: string;
  root: TreeNode;
  orphans: TreeNode[];
}

interface StatusCounts {
  total: number;
  byStatus: Record<string, number>;
}

function countStatuses(root: TreeNode, orphans: TreeNode[]): StatusCounts {
  const byStatus: Record<string, number> = {};
  let total = 0;

  function walk(node: TreeNode): void {
    total += 1;
    if (node.status && node.status in STATUS_META) {
      byStatus[node.status] = (byStatus[node.status] ?? 0) + 1;
    }
    node.children.forEach(walk);
  }

  walk(root);
  orphans.forEach(walk);
  return { total, byStatus };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let measureCanvas: HTMLCanvasElement | null = null;

/** Only ever called from a browser click handler (never during render/SSR),
 * so a real canvas is always available for accurate text measurement. */
function measureTextWidth(text: string, font: string): number {
  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return text.length * 7;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/**
 * Greedily wraps `text` to fit `maxWidth` at `font`, capped at `maxLines` —
 * box height in the diagram is fixed (uniform NODE_HEIGHT spacing is baked
 * into the layout math), so labels are truncated with an ellipsis rather
 * than growing their box.
 */
function wrapText(text: string, maxWidth: number, font: string, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";
  let wordIndex = 0;

  while (wordIndex < words.length && lines.length < maxLines) {
    const word = words[wordIndex];
    const attempt = current ? `${current} ${word}` : word;
    if (!current || measureTextWidth(attempt, font) <= maxWidth) {
      current = attempt;
      wordIndex += 1;
    } else {
      lines.push(current);
      current = "";
    }
  }
  if (current) lines.push(current);

  const hasLeftover = wordIndex < words.length;
  if (hasLeftover && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 0 && measureTextWidth(`${last}…`, font) > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${last}…`;
  }

  return lines;
}

function renderNodeSvg(node: FlowNode): string {
  const { data, position } = node;
  const isRoot = data.side === "root";
  const x = position.x;
  const y = position.y;
  const padX = 14;

  const fill = isRoot ? ROOT_COLOR : "#ffffff";
  const textColor = isRoot ? "#ffffff" : LABEL_COLOR;
  const typeColor = isRoot ? "rgba(255,255,255,0.75)" : MUTED_COLOR;
  const dash = data.disconnected ? ` stroke-dasharray="6 4"` : "";
  const radius = isRoot ? NODE_HEIGHT / 2 : CARD_RADIUS;

  const parts: string[] = [
    `<rect x="${x}" y="${y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="${radius}" fill="${fill}" stroke="${data.branchColor}" stroke-width="2"${dash} />`,
  ];

  if (data.type) {
    parts.push(
      `<text x="${x + padX}" y="${y + 18}" font-family="${FONT}" font-size="10" font-weight="700" letter-spacing="0.5" fill="${typeColor}">${escapeXml(data.type.toUpperCase())}</text>`,
    );
  }

  if (data.status && STATUS_META[data.status]) {
    const meta = STATUS_META[data.status];
    const badgeText = meta.label.toUpperCase();
    const badgeFont = `700 9px ${FONT}`;
    const badgeWidth = measureTextWidth(badgeText, badgeFont) + 14;
    const badgeHeight = 16;
    const badgeX = x + NODE_WIDTH - padX - badgeWidth;
    const badgeY = y + 8;
    parts.push(
      `<rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="${badgeHeight / 2}" fill="${meta.color}" />`,
      `<text x="${badgeX + badgeWidth / 2}" y="${badgeY + badgeHeight / 2 + 3}" font-family="${FONT}" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(badgeText)}</text>`,
    );
  }

  const labelFont = `700 13px ${FONT}`;
  const labelLines = wrapText(data.label, NODE_WIDTH - padX * 2, labelFont, 2);
  labelLines.forEach((line, index) => {
    parts.push(
      `<text x="${x + padX}" y="${y + 42 + index * 16}" font-family="${FONT}" font-size="13" font-weight="700" fill="${textColor}">${escapeXml(line)}</text>`,
    );
  });

  return parts.join("\n");
}

function renderEdgeSvg(edge: FlowEdge, nodesById: Map<string, FlowNode>): string {
  const source = nodesById.get(edge.source);
  const target = nodesById.get(edge.target);
  if (!source || !target) return "";

  const startY = source.position.y + NODE_HEIGHT / 2;
  const endY = target.position.y + NODE_HEIGHT / 2;
  const targetIsRight = target.position.x >= source.position.x;
  const startX = targetIsRight ? source.position.x + NODE_WIDTH : source.position.x;
  const endX = targetIsRight ? target.position.x : target.position.x + NODE_WIDTH;
  const midX = (startX + endX) / 2;

  const stroke = edge.style?.stroke ?? "#9ca3af";
  const strokeWidth = edge.style?.strokeWidth ?? 2;
  const strokeDasharray = edge.style?.strokeDasharray;
  const dash = strokeDasharray ? ` stroke-dasharray="${strokeDasharray}"` : "";

  return `<path d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"${dash} />`;
}

/**
 * Builds a self-contained, portable SVG "delivery artifact" for a
 * regression tree: a header (tree name, platform, export time, total/
 * per-status node counts) above the diagram — always in a fixed light
 * palette, independent of the app's current theme, and made of real
 * SVG primitives (not a DOM screenshot) so it renders correctly anywhere.
 */
export function buildTreeReportSvg({
  treeName,
  platformName,
  root,
  orphans,
}: BuildTreeReportSvgParams): string {
  const layout = layoutTree(root, orphans);
  const counts = countStatuses(root, orphans);

  const xs = layout.nodes.flatMap((node) => [node.position.x, node.position.x + NODE_WIDTH]);
  const ys = layout.nodes.flatMap((node) => [node.position.y, node.position.y + NODE_HEIGHT]);
  const minX = Math.min(0, ...xs);
  const maxX = Math.max(0, ...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);

  const offsetX = PADDING - minX;
  const offsetY = HEADER_HEIGHT + PADDING - minY;

  const shiftedNodes = layout.nodes.map((node) => ({
    ...node,
    position: { x: node.position.x + offsetX, y: node.position.y + offsetY },
  }));
  const nodesById = new Map(shiftedNodes.map((node) => [node.id, node]));

  const totalWidth = Math.max(maxX - minX + PADDING * 2, 720);
  const totalHeight = HEADER_HEIGHT + (maxY - minY) + PADDING * 2;

  const edgesSvg = layout.edges.map((edge) => renderEdgeSvg(edge, nodesById)).join("\n");
  const nodesSvg = shiftedNodes.map(renderNodeSvg).join("\n");

  const headerParts: string[] = [
    `<text x="${PADDING}" y="40" font-family="${FONT}" font-size="26" font-weight="700" fill="${LABEL_COLOR}">${escapeXml(treeName)}</text>`,
    `<text x="${PADDING}" y="64" font-family="${FONT}" font-size="14" font-weight="600" fill="${MUTED_COLOR}">Platform: ${escapeXml(platformName)}</text>`,
    `<text x="${PADDING}" y="82" font-family="${FONT}" font-size="11" fill="${MUTED_COLOR}">Exported ${escapeXml(new Date().toLocaleString())}</text>`,
  ];

  let summaryX = PADDING;
  const summaryY = 112;
  const totalText = `${counts.total} node${counts.total === 1 ? "" : "s"} total`;
  const totalFont = `700 13px ${FONT}`;
  headerParts.push(
    `<text x="${summaryX}" y="${summaryY}" font-family="${FONT}" font-size="13" font-weight="700" fill="${LABEL_COLOR}">${escapeXml(totalText)}</text>`,
  );
  summaryX += measureTextWidth(totalText, totalFont) + 20;

  Object.entries(STATUS_META).forEach(([key, meta]) => {
    const count = counts.byStatus[key];
    if (!count) return;
    headerParts.push(`<circle cx="${summaryX}" cy="${summaryY - 4}" r="5" fill="${meta.color}" />`);
    summaryX += 12;
    const text = `${meta.label} ${count}`;
    const textFont = `12px ${FONT}`;
    headerParts.push(
      `<text x="${summaryX}" y="${summaryY}" font-family="${FONT}" font-size="12" fill="${MUTED_COLOR}">${escapeXml(text)}</text>`,
    );
    summaryX += measureTextWidth(text, textFont) + 18;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />
${headerParts.join("\n")}
<line x1="${PADDING}" y1="${HEADER_HEIGHT - 20}" x2="${totalWidth - PADDING}" y2="${HEADER_HEIGHT - 20}" stroke="${DIVIDER_COLOR}" stroke-width="1" />
${edgesSvg}
${nodesSvg}
</svg>`;
}
