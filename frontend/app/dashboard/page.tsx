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
  const currentUser = useMindmapStore((state) => state.currentUser);
  const authReady = useMindmapStore((state) => state.authReady);
  const loading = useMindmapStore((state) => state.loading);
  const error = useMindmapStore((state) => state.error);

  const [title, setTitle] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (!authReady || !currentUser) return;

    const load = async () => {
      try {
        await useMindmapStore.getState().fetchMindmaps();
      } catch {
        // error is already stored in Zustand
      } finally {
        setHasLoadedOnce(true);
      }
    };
    load().catch(() => {});
  }, [authReady, currentUser]);

  useEffect(() => {
    if (!authReady) return;
    if (!currentUser) {
      router.push("/");
    }
  }, [authReady, currentUser, router]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    await createMindmap(trimmed);
    setTitle("");
  };

  const handleDelete = async (id: number, name: string) => {
    await deleteMindmap(id);
  };

  return (
    <div className="flex h-full w-full flex-col bg-neutral-50">
      <div className="px-8 pt-10 pb-8">
        <h1 className="text-2xl font-medium text-neutral-900 mb-6">Mindmaps</h1>
        <form onSubmit={handleCreate} className="flex items-center gap-3 max-w-md">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New mindmap..."
            className="flex-1 h-10 bg-white border-neutral-200 focus:border-neutral-400 focus:ring-0"
          />
          <Button
            type="submit"
            disabled={!title.trim()}
            className="hover:cursor-pointer h-10 px-5 bg-neutral-900 hover:bg-neutral-600 text-white"
          >
            Create
          </Button>
        </form>
      </div>

      {error && (
        <div className="px-8 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="relative flex-1 overflow-auto px-8 pb-8">
        {loading && !hasLoadedOnce && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-50">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          </div>
        )}

        <div className="grid gap-3">
          {mindmaps.map((m) => (
            <div
              key={m.id}
              className="group flex items-center justify-between p-4 bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 cursor-pointer transition-colors"
              onClick={() => router.push(`/mindmaps/${m.id}`)}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-neutral-900">
                  {m.title}
                </span>
                <span className="text-xs text-neutral-500">
                  {m.node_count} node{m.node_count === 1 ? "" : "s"} · {m.total_collaborators} collaborator{m.total_collaborators === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-neutral-400 hidden sm:inline">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  className="hover:cursor-pointer text-xs text-neutral-400 hover:text-red-800 hover:text-[14px] opacity-0 group-hover:opacity-100 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(m.id, m.title);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {mindmaps.length === 0 && !loading && hasLoadedOnce && (
          <div className="text-sm text-neutral-500 mt-4">
            No mindmaps yet. Create your first one above.
          </div>
        )}
      </div>
    </div>
  );
}


