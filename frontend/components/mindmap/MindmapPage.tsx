"use client";

import { useEffect } from "react";
import { useMindmapStore } from "@/lib/store";
import { MindmapCanvas } from "./MindmapCanvas";
import { NodeSidePanel } from "./NodeSidePanel";
import { MindmapHeader } from "./MindmapHeader";

type MindmapPageProps = {
    mindmapId: number;
};

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

    return (
        <div className="flex h-full w-full flex-col">
            <MindmapHeader mindmapId={mindmapId} />
            <div className="flex flex-1">
                <div className="flex-1">
                    <MindmapCanvas mindmapId={mindmapId} onAddChild={handleAddChild} />
                </div>
                <div className="w-80 flex-shrink-0">
                    <NodeSidePanel mindmapId={mindmapId} />
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


