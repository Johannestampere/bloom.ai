"use client";

import { useMemo, useEffect, useRef, useState, MouseEvent } from "react";
import { useMindmapStore } from "@/lib/store";
import { buildGraph } from "@/lib/graph";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MindmapCanvasProps = {
  mindmapId: number;
  onAddChild?: (parentId: number) => void;
};

const CANVAS_SIZE = 3000;
const CANVAS_CENTER = CANVAS_SIZE / 2;

export function MindmapCanvas({ mindmapId, onAddChild }: MindmapCanvasProps) {
  const nodesByMindmapId = useMindmapStore((state) => state.nodesByMindmapId);
  const selectedNodeId = useMindmapStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useMindmapStore((state) => state.setSelectedNodeId);
  const [scale, setScale] = useState(1);
  const [hasCentered, setHasCentered] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const touchStateRef = useRef<{
    lastDistance: number;
    lastCenterX: number;
    lastCenterY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = -event.deltaY;
      const factor = delta > 0 ? 1.05 : 0.95;
      setScale((prev) => {
        const next = prev * factor;
        return Math.min(3, Math.max(0.3, next));
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

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

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;

    setIsPanning(true);
    panStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    const el = containerRef.current;
    const pan = panStateRef.current;
    if (!el || !pan) return;

    event.preventDefault();
    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;

    el.scrollLeft = pan.scrollLeft - dx;
    el.scrollTop = pan.scrollTop - dy;
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
    panStateRef.current = null;
  };

  // Touch gesture handlers for pinch-to-zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const center = getCenter(t1, t2);
        touchStateRef.current = {
          lastDistance: getDistance(t1, t2),
          lastCenterX: center.x,
          lastCenterY: center.y,
          scrollLeft: el.scrollLeft,
          scrollTop: el.scrollTop,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStateRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const distance = getDistance(t1, t2);
        const center = getCenter(t1, t2);
        const state = touchStateRef.current;

        // Pinch to zoom
        const scaleFactor = distance / state.lastDistance;
        setScale((prev) => {
          const next = prev * scaleFactor;
          return Math.min(3, Math.max(0.3, next));
        });

        // Two-finger pan
        const dx = center.x - state.lastCenterX;
        const dy = center.y - state.lastCenterY;
        el.scrollLeft = state.scrollLeft - dx;
        el.scrollTop = state.scrollTop - dy;

        // Update state for next move
        touchStateRef.current = {
          lastDistance: distance,
          lastCenterX: center.x,
          lastCenterY: center.y,
          scrollLeft: el.scrollLeft,
          scrollTop: el.scrollTop,
        };
      }
    };

    const handleTouchEnd = () => {
      touchStateRef.current = null;
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 overflow-auto bg-[#EAEBD6]",
        isPanning ? "cursor-grabbing" : "cursor-grab"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
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
        <svg
          className="pointer-events-none absolute inset-0"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
        >
          {graph.edges.map((edge) => {
            const source = graph.nodesById[edge.source];
            const target = graph.nodesById[edge.target];
            if (!source || !target) return null;

            const sx = CANVAS_CENTER + source.x;
            const sy = CANVAS_CENTER + source.y;
            const tx = CANVAS_CENTER + target.x;
            const ty = CANVAS_CENTER + target.y;

            // Calculate direction vector from source to target
            const dx = tx - sx;
            const dy = ty - sy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return null;

            // Normalize direction
            const nx = dx / dist;
            const ny = dy / dist;

            // Node dimensions
            const nodeRadiusX = 60;
            const nodeRadiusY = 16;

            // Calculate edge intersection for ellipse-like shape
            // Using ellipse formula to find where the line exits the node
            const getEdgePoint = (cx: number, cy: number, dirX: number, dirY: number) => {
              const t = 1 / Math.sqrt((dirX * dirX) / (nodeRadiusX * nodeRadiusX) + (dirY * dirY) / (nodeRadiusY * nodeRadiusY));
              return {
                x: cx + dirX * t,
                y: cy + dirY * t,
              };
            };

            const start = getEdgePoint(sx, sy, nx, ny);
            const end = getEdgePoint(tx, ty, -nx, -ny);

            return (
              <line
                key={edge.id}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#000000"
                strokeWidth={1.5}
              />
            );
          })}
        </svg>

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
                    "bg-white text-black border-black",
                    "hover:bg-gray-50",
                    voteGlow,
                    node.is_ai_generated && "border-dashed",
                    isSelected && "border-2 border-black bg-gray-100"
                  )}
                >
                  <span className="truncate font-medium">{node.title}</span>
                  <span className="mt-1 text-[10px] text-gray-500">
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


