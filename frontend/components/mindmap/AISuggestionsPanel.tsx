"use client";

import { useEffect, useState, FormEvent } from "react";
import { useMindmapStore } from "@/lib/store";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { AISuggestion } from "@/lib/types";

type AISuggestionsPanelProps = {
  mindmapId: number;
  onClose: () => void;
};

type SelectableSuggestion = AISuggestion & { id: number; selected: boolean };

export function AISuggestionsPanel({
  mindmapId,
  onClose,
}: AISuggestionsPanelProps) {
  const nodesByMindmapId = useMindmapStore((state) => state.nodesByMindmapId);
  const selectedNodeId = useMindmapStore((state) => state.selectedNodeId);
  const createNode = useMindmapStore((state) => state.createNode);

  const nodes = nodesByMindmapId[mindmapId] ?? [];
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

    const [suggestions, setSuggestions] = useState<SelectableSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const loadSuggestions = async () => {
        if (!selectedNode) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.getAISuggestions(selectedNode.id);
            const withIds = res.suggestions.map((s, index) => ({
                ...s,
                id: index,
                selected: false,
            }));
                setSuggestions(withIds);
        } catch (err: any) {
            setError(err.message ?? "Failed to generate ideas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedNode) return;
            loadSuggestions().catch(() => {});
    }, [selectedNode?.id]);

    if (!selectedNode) {
        return (
            <div className="h-full border-l border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                Select a node to generate AI ideas.
            </div>
        );
    }

    const toggleSelection = (id: number) => {
        setSuggestions((prev) =>
            prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
        );
    };

    const handleAddSelected = async (e: FormEvent) => {
        e.preventDefault();
        const chosen = suggestions.filter((s) => s.selected);
        if (!chosen.length) return;
        setSubmitting(true);

        try {
            for (const s of chosen) {
                await createNode({
                    mindmapId,
                    title: s.title,
                    content: s.content ?? "",
                    parent_id: selectedNode.id,
                });
            }
            onClose();
        } catch (err) {
        // error is handled in store
        } finally {
            setSubmitting(false);
        }
    };

    const anySelected = suggestions.some((s) => s.selected);

    return (
        <div className="h-full border-l border-slate-800 bg-slate-900/60 p-4">
        <Panel title="AI Suggestions" className="flex h-full flex-col bg-slate-900/80">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <div>
                <div>Based on your idea:</div>
                <div className="truncate text-slate-100">
                “{selectedNode.title || "Untitled node"}”
                </div>
            </div>
            <Button
                type="button"
                variant="secondary"
                className="h-7 px-3 text-[11px]"
                onClick={onClose}
            >
                Back to node
            </Button>
            </div>

            {loading && (
            <div className="text-xs text-slate-400">Generating ideas…</div>
            )}
            {error && (
            <div className="mb-2 text-xs text-red-300">
                {error}{" "}
                <button
                    type="button"
                    className="underline"
                    onClick={() => loadSuggestions()}
                >
                Try again
                </button>
            </div>
            )}

            {!loading && !error && suggestions.length === 0 && (
                <div className="text-xs text-slate-400">
                    No ideas generated. Try again or adjust your node content.
                </div>
            )}

            <form
                onSubmit={handleAddSelected}
                className="mt-2 flex flex-1 flex-col overflow-hidden"
            >
            <div className="flex-1 space-y-2 overflow-auto pr-1 text-xs">
                {suggestions.map((s) => (
                    <label
                        key={s.id}
                        className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 hover:border-emerald-400/60"
                    >
                        <input
                            type="checkbox"
                            className="mt-1 h-3 w-3 rounded border-slate-500 bg-slate-900 text-emerald-500 focus:ring-0"
                            checked={s.selected}
                            onChange={() => toggleSelection(s.id)}
                        />
                        <div>
                        <div className="font-medium text-slate-100">{s.title}</div>
                            {s.content && (
                                <div className="mt-1 text-[11px] text-slate-400">
                                {s.content}
                                </div>
                            )}
                        </div>
                    </label>
                ))}
            </div>

            <div className="mt-3 flex justify-between border-t border-slate-800 pt-3 text-xs">
                <Button
                    type="button"
                    variant="secondary"
                    className="text-[11px]"
                    onClick={onClose}
                >
                Discard
                </Button>
                <Button
                    type="submit"
                    className="text-[11px]"
                    disabled={!anySelected || submitting}
                >
                Add selected ideas
                </Button>
            </div>
            </form>
        </Panel>
        </div>
    );
}


