"use client";

import { useEffect, useState, useCallback } from "react";
import { useMindmapStore } from "@/lib/store";
import { MindmapCanvas } from "./MindmapCanvas";
import { NodeSidePanel } from "./NodeSidePanel";
import { MindmapHeader } from "./MindmapHeader";
import { CollaboratorsPanel } from "./CollaboratorsPanel";
import { AISuggestionsPanel } from "./AISuggestionsPanel";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type MindmapPageProps = {
    mindmapId: number;
};

type SidePanel = "node" | "collaborators" | "ai";

export function MindmapPage({ mindmapId }: MindmapPageProps) {
    const createNode = useMindmapStore((state) => state.createNode);
    const setSelectedNodeId = useMindmapStore((state) => state.setSelectedNodeId);
    const error = useMindmapStore((state) => state.error);

    const [activePanel, setActivePanel] = useState<SidePanel>("node");
    const [nodesLoading, setNodesLoading] = useState(true);
    const [headerLoading, setHeaderLoading] = useState(true);
    const [headerHidden, setHeaderHidden] = useState(false);

    const isFullyLoaded = !nodesLoading && !headerLoading;

    const handleHeaderLoadingChange = useCallback((loading: boolean) => {
        setHeaderLoading(loading);
    }, []);

    useEffect(() => {
        const fetchNodes = async () => {
        try {
            await useMindmapStore
            .getState()
            .fetchMindmapNodes(mindmapId);
        } catch {
            // ignore errors here; store already tracks error state
        } finally {
            setNodesLoading(false);
        }
        };

        setNodesLoading(true);
        fetchNodes().catch(() => {});

        const nodesChannel = supabase
        .channel(`mindmap-${mindmapId}-nodes`)
        .on(
            "postgres_changes",
            {
            event: "*",
            schema: "public",
            table: "nodes",
            filter: `mindmap_id=eq.${mindmapId}`,
            },
            () => {
            fetchNodes().catch(() => {});
            }
        )
        .subscribe();

        return () => {
        supabase.removeChannel(nodesChannel);
        };
    }, [mindmapId]);

    const handleAddChild = async (parentId: number) => {
        try {
        const newId = await createNode({
            mindmapId,
            title: "New node",
            content: "",
            parent_id: parentId,
        });
        setSelectedNodeId(newId);
        } catch {
        // Errors are handled in the store
        }
    };

    const toggleCollaboratorsPanel = () => {
        setActivePanel((prev) =>
        prev === "collaborators" ? "node" : "collaborators"
        );
    };

    const openAIPanel = () => {
        setActivePanel("ai");
    };

    return (
        <div className="flex h-full w-full flex-col min-h-0">
        {/* Header with slide animation */}
        <div
            className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                headerHidden ? "max-h-0" : "max-h-20"
            )}
        >
            <MindmapHeader
                mindmapId={mindmapId}
                isCollaboratorsOpen={activePanel === "collaborators"}
                onToggleCollaborators={toggleCollaboratorsPanel}
                onLoadingChange={handleHeaderLoadingChange}
                isHidden={headerHidden}
                onToggleHidden={() => setHeaderHidden(true)}
            />
        </div>

        {/* Show header button when hidden */}
        {headerHidden && (
            <button
                type="button"
                onClick={() => setHeaderHidden(false)}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-white border border-neutral-200 rounded-full text-xs text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
                Show header
            </button>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden">
            {!isFullyLoaded && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-50">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
                </div>
            )}
            <MindmapCanvas mindmapId={mindmapId} onAddChild={handleAddChild} />
            </div>
            <div className="w-80 flex-shrink-0">
            {activePanel === "node" && (
                <NodeSidePanel mindmapId={mindmapId} onOpenAISuggestions={openAIPanel} />
            )}
            {activePanel === "collaborators" && (
                <CollaboratorsPanel mindmapId={mindmapId} />
            )}
            {activePanel === "ai" && (
                <AISuggestionsPanel mindmapId={mindmapId} onClose={() => setActivePanel("node")} />
            )}
            </div>
        </div>
        {error && (
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center">
            <div className="pointer-events-auto rounded-md bg-red-500/90 px-3 py-1.5 text-xs text-white shadow-lg">
                {error}
            </div>
            </div>
        )}
        </div>
    );
}


