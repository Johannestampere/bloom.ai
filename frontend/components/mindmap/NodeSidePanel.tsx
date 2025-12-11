"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMindmapStore } from "@/lib/store";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";

type NodeSidePanelProps = {
  mindmapId: number;
};

// This is the side panel that shows up when the user selects a node. 
// It allows the user to edit title and content, choose to add a child or delete the node, and see the voters.
export function NodeSidePanel({ mindmapId }: NodeSidePanelProps) {
    const { nodesByMindmapId, selectedNodeId, updateNode } = useMindmapStore((state) => ({
        nodesByMindmapId: state.nodesByMindmapId,
        selectedNodeId: state.selectedNodeId,
        updateNode: state.updateNode,
    }));

    const nodes = nodesByMindmapId[mindmapId] ?? [];
    const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const titleRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (selectedNode) {
        setTitle(selectedNode.title ?? "");
        setContent(selectedNode.content ?? "");
        // Focus title when a node becomes selected (including new ones)
        if (titleRef.current) {
            titleRef.current.focus();
            titleRef.current.select();
        }
        } else {
        setTitle("");
        setContent("");
        }
    }, [selectedNode?.id]);

    const handleSave = async () => {
        if (!selectedNode) return;
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;

        await updateNode(selectedNode.id, {
        title: trimmedTitle,
        content: content.length ? content : null,
        });
    };

    if (!selectedNode) {
        return (
        <div className="h-full border-l border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
            Select a node to edit its details.
        </div>
        );
    }

    return (
        <div className="h-full border-l border-slate-800 bg-slate-900/60 p-4">
        <Panel title="Node details" className="h-full bg-slate-900/80">
            <div className="flex flex-col gap-4">
            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                Title
                </label>
                <Input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                placeholder="Node title"
                />
            </div>

            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                Content
                </label>
                <textarea
                className="min-h-[120px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400 focus:ring-0"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleSave}
                placeholder="Node details"
                />
            </div>
            </div>
        </Panel>
        </div>
    );
}


