"use client";

import { useEffect, useState, useCallback } from "react";
import { useMindmapStore } from "@/lib/store";
import { MindmapCanvas } from "./MindmapCanvas";
import { NodeSidePanel } from "./NodeSidePanel";
import { MindmapHeader } from "./MindmapHeader";
import { CollaboratorsPanel } from "./CollaboratorsPanel";
import { AISuggestionsPanel } from "./AISuggestionsPanel";
import { supabase } from "@/lib/supabase";

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
        <MindmapHeader
            mindmapId={mindmapId}
            isCollaboratorsOpen={activePanel === "collaborators"}
            onToggleCollaborators={toggleCollaboratorsPanel}
            onLoadingChange={handleHeaderLoadingChange}
        />
        <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden">
            {!isFullyLoaded && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#EAEBD6]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#465775] border-t-transparent" />
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
            <div className="pointer-events-auto rounded-md bg-red-900/80 px-3 py-1 text-xs text-red-100 shadow">
                {error}
            </div>
            </div>
        )}
        </div>
    );
}


