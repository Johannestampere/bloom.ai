"use client";

import { useEffect, useState, FormEvent } from "react";
import { useMindmapStore } from "@/lib/store";
import { Panel } from "@/components/ui/panel";
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
            <div className="h-full border-l border-neutral-200 bg-white p-4 text-sm text-neutral-500">
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
        <div className="h-full border-l border-neutral-200 bg-white p-4">
        <Panel title="AI Suggestions" className="flex h-full flex-col">
            <div className="mb-4 flex items-center justify-between text-xs">
            <div className="text-neutral-500">
                <div>Based on:</div>
                <div className="truncate text-neutral-900 font-medium">
                "{selectedNode.title || "Untitled node"}"
                </div>
            </div>
            <button
                type="button"
                className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                onClick={onClose}
            >
                Back
            </button>
            </div>

            {loading && (
            <div className="text-xs text-neutral-400">Generating ideas…</div>
            )}
            {error && (
            <div className="mb-2 text-xs text-red-500">
                {error}{" "}
                <button
                    type="button"
                    className="underline hover:no-underline"
                    onClick={() => loadSuggestions()}
                >
                Try again
                </button>
            </div>
            )}

            {!loading && !error && suggestions.length === 0 && (
                <div className="text-xs text-neutral-400">
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
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 hover:border-neutral-300 transition-colors"
                    >
                        <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-0"
                            checked={s.selected}
                            onChange={() => toggleSelection(s.id)}
                        />
                        <div>
                        <div className="font-medium text-neutral-900">{s.title}</div>
                            {s.content && (
                                <div className="mt-1 text-[11px] text-neutral-500">
                                {s.content}
                                </div>
                            )}
                        </div>
                    </label>
                ))}
            </div>

            <div className="mt-4 flex justify-between border-t border-neutral-100 pt-4 text-xs">
                <button
                    type="button"
                    className="rounded-md bg-neutral-100 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-200 transition-colors"
                    onClick={onClose}
                >
                Discard
                </button>
                <button
                    type="submit"
                    className="rounded-md bg-neutral-100 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-200 transition-colors disabled:bg-neutral-50 disabled:text-neutral-300"
                    disabled={!anySelected || submitting}
                >
                Add selected
                </button>
            </div>
            </form>
        </Panel>
        </div>
    );
}


