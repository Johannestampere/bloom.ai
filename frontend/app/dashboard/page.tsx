"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMindmapStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const router = useRouter();
  const mindmaps = useMindmapStore((state) => state.mindmaps);
  const createMindmap = useMindmapStore((state) => state.createMindmap);
  const deleteMindmap = useMindmapStore((state) => state.deleteMindmap);
  const loading = useMindmapStore((state) => state.loading);
  const error = useMindmapStore((state) => state.error);

  const [title, setTitle] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        await useMindmapStore.getState().fetchMindmaps();
      } catch {
        // error is already stored in Zustand
      }
    };
    load().catch(() => {});
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    await createMindmap(trimmed);
    setTitle("");
  };

  const handleDelete = async (id: number, name: string) => {
    const ok = window.confirm(
      `Delete “${name}” and all its nodes? This cannot be undone.`
    );
    if (!ok) return;
    await deleteMindmap(id);
  };

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 text-slate-50">
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Mindmaps</h1>
        </div>
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New mindmap title"
            className="w-56"
          />
          <Button type="submit" disabled={!title.trim()}>
            Create
          </Button>
        </form>
      </div>

      {loading && (
        <div className="px-6 py-2 text-xs text-slate-400">Loading…</div>
      )}
      {error && (
        <div className="px-6 py-2 text-xs text-red-300">{error}</div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {mindmaps.map((m) => (
            <div
              key={m.id}
              className="group flex w-full cursor-pointer items-center justify-between border-b border-slate-900 px-6 py-3 hover:bg-slate-900/60"
              onClick={() => router.push(`/mindmaps/${m.id}`)}
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-100">
                  {m.title}
                </span>
                <span className="text-xs text-slate-400">
                  {m.node_count} node{m.node_count === 1 ? "" : "s"} ·{" "}
                  {m.total_collaborators} collaborator
                  {m.total_collaborators === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="hidden sm:inline">
                  Created {new Date(m.created_at).toLocaleDateString()}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(m.id, m.title);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}

          {mindmaps.length === 0 && !loading && (
            <div className="px-6 py-8 text-sm text-slate-400">
              No mindmaps yet. Use the form above to create your first mindmap.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


