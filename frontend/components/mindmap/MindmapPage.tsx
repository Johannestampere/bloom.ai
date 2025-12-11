"use client";

import { useEffect, useState } from "react";
import { useMindmapStore } from "@/lib/store";
import { MindmapCanvas } from "./MindmapCanvas";
import { NodeSidePanel } from "./NodeSidePanel";
import { MindmapHeader } from "./MindmapHeader";
import { CollaboratorsPanel } from "./CollaboratorsPanel";
import { AISuggestionsPanel } from "./AISuggestionsPanel";

type MindmapPageProps = {
    mindmapId: number;
};

type SidePanel = "node" | "collaborators" | "ai";

export function MindmapPage({ mindmapId }: MindmapPageProps) {
    const {
        fetchMindmapNodes,
        createNode,
        setSelectedNodeId,
        loading,
        error,
    } = useMindmapStore((state) => ({
        fetchMindmapNodes: state.fetchMindmapNodes,
        createNode: state.createNode,
        setSelectedNodeId: state.setSelectedNodeId,
        loading: state.loading,
        error: state.error,
    }));

    const [activePanel, setActivePanel] = useState<SidePanel>("node");

    useEffect(() => {
        fetchMindmapNodes(mindmapId).catch(() => {});
    }, [fetchMindmapNodes, mindmapId]);

    const handleAddChild = async (parentId: number) => {
        try {
        const newId = await createNode({
            mindmapId,
            title: "",
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
        <div className="flex h-full w-full flex-col">
        <MindmapHeader
            mindmapId={mindmapId}
            isCollaboratorsOpen={activePanel === "collaborators"}
            onToggleCollaborators={toggleCollaboratorsPanel}
        />
        <div className="flex flex-1">
            <div className="flex-1">
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
        {loading && (
            <div className="pointer-events-none fixed inset-x-0 top-14 z-20 flex justify-center">
            <div className="rounded-full bg-slate-900/90 px-3 py-1 text-xs text-slate-300 shadow">
                Loading…
            </div>
            </div>
        )}
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


