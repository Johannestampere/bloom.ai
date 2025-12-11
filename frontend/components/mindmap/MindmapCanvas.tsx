"use client";

import { useMemo, useState, useEffect, useRef, MouseEvent } from "react";
import { useMindmapStore } from "@/lib/store";
import { buildGraph } from "@/lib/graph";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MindmapCanvasProps = {
  mindmapId: number;
  onAddChild?: (parentId: number) => void;
};

const CANVAS_SIZE = 2200;
const CANVAS_CENTER = CANVAS_SIZE / 2;

export function MindmapCanvas({ mindmapId, onAddChild }: MindmapCanvasProps) {
  const nodesByMindmapId = useMindmapStore((state) => state.nodesByMindmapId);
  const selectedNodeId = useMindmapStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useMindmapStore((state) => state.setSelectedNodeId);

  const [scale, setScale] = useState(1);
  const [hasCentered, setHasCentered] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const nodes = nodesByMindmapId[mindmapId] ?? [];
  const graph = useMemo(() => buildGraph(nodes), [nodes]);

  useEffect(() => {
    if (hasCentered) return;
    const el = containerRef.current;
    if (!el) return;

    const targetLeft = CANVAS_CENTER - el.clientWidth / 2;
    const targetTop = CANVAS_CENTER - el.clientHeight / 2;

    el.scrollLeft = Math.max(targetLeft, 0);
    el.scrollTop = Math.max(targetTop, 0);
    setHasCentered(true);
  }, [hasCentered, mindmapId, graph]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = -event.deltaY;
      const factor = delta > 0 ? 1.05 : 0.95;
      setScale((prev) => {
        const next = prev * factor;
        return Math.min(3, Math.max(0.3, next));
      });
    }
  };

  const handleNodeClick = (id: number, e: MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(id === selectedNodeId ? null : id);
  };

  const handleNodeDoubleClick = (id: number, e: MouseEvent) => {
    e.stopPropagation();
    if (onAddChild) {
      onAddChild(id);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-auto bg-slate-950"
      onWheel={handleWheel}
      onClick={() => setSelectedNodeId(null)}
    >
      <div
        className="relative"
        style={{
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {/* Edges */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
        >
          {graph.edges.map((edge) => {
            const source = graph.nodesById[edge.source];
            const target = graph.nodesById[edge.target];
            if (!source || !target) return null;
            const x1 = CANVAS_CENTER + source.x;
            const y1 = CANVAS_CENTER + source.y;
            const x2 = CANVAS_CENTER + target.x;
            const y2 = CANVAS_CENTER + target.y;
            return (
              <line
                key={edge.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#334155"
                strokeWidth={1.5}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {Object.values(graph.nodesById).map((node) => {
          const left = CANVAS_CENTER + node.x;
          const top = CANVAS_CENTER + node.y;
          const isSelected = node.id === selectedNodeId;

          const label = [
            node.title,
            node.content ? `\n${node.content}` : "",
            `\nVotes: ${node.vote_count}`,
          ].join("");

          let voteGlow = "";
          if (node.vote_count >= 3) {
            voteGlow =
              "shadow-[0_0_35px_rgba(16,185,129,0.8)] border-emerald-400/90";
          } else if (node.vote_count >= 2) {
            voteGlow =
              "shadow-[0_0_22px_rgba(16,185,129,0.6)] border-emerald-300/80";
          } else if (node.vote_count > 0) {
            voteGlow =
              "shadow-[0_0_12px_rgba(16,185,129,0.4)] border-emerald-300/60";
          }

          return (
            <div
              key={node.id}
              className="absolute"
              style={{ left, top }}
            >
              <Tooltip label={label}>
                <button
                  type="button"
                  onClick={(e) => handleNodeClick(node.id, e)}
                  onDoubleClick={(e) => handleNodeDoubleClick(node.id, e)}
                  className={cn(
                    "flex min-w-[120px] max-w-[220px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-full border px-4 py-2 text-xs shadow-sm transition-colors",
                    "bg-slate-900/80 text-slate-100 border-slate-700",
                    "hover:border-emerald-400/80 hover:text-emerald-100",
                    voteGlow,
                    node.is_ai_generated && "border-dashed",
                    isSelected &&
                      "border-emerald-400 bg-emerald-500/10 text-emerald-50"
                  )}
                >
                  <span className="truncate font-medium">{node.title}</span>
                  <span className="mt-1 text-[10px] text-slate-400">
                    {node.vote_count} vote{node.vote_count === 1 ? "" : "s"}
                  </span>
                </button>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}


