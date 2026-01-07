"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMindmapStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvitationsPanel } from "@/components/dashboard/InvitationsPanel";

type FilterType = "all" | "owned" | "shared";

export default function DashboardPage() {
  const router = useRouter();
  const mindmaps = useMindmapStore((state) => state.mindmaps);
  const invitations = useMindmapStore((state) => state.invitations);
  const createMindmap = useMindmapStore((state) => state.createMindmap);
  const deleteMindmap = useMindmapStore((state) => state.deleteMindmap);
  const currentUser = useMindmapStore((state) => state.currentUser);
  const authReady = useMindmapStore((state) => state.authReady);
  const loading = useMindmapStore((state) => state.loading);
  const error = useMindmapStore((state) => state.error);

  const [title, setTitle] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredMindmaps = useMemo(() => {
    if (!currentUser) return mindmaps;
    if (filter === "owned") {
      return mindmaps.filter((m) => m.owner_id === currentUser.id);
    }
    if (filter === "shared") {
      return mindmaps.filter((m) => m.owner_id !== currentUser.id);
    }
    return mindmaps;
  }, [mindmaps, currentUser, filter]);

  const ownedCount = useMemo(() => {
    if (!currentUser) return 0;
    return mindmaps.filter((m) => m.owner_id === currentUser.id).length;
  }, [mindmaps, currentUser]);

  const sharedCount = useMemo(() => {
    if (!currentUser) return 0;
    return mindmaps.filter((m) => m.owner_id !== currentUser.id).length;
  }, [mindmaps, currentUser]);

  useEffect(() => {
    if (!authReady || !currentUser) return;

    const load = async () => {
      try {
        await Promise.all([
          useMindmapStore.getState().fetchMindmaps(),
          useMindmapStore.getState().fetchInvitations(),
        ]);
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
      <div className="px-8 pt-10 pb-6">
        <h1 className="text-2xl font-medium text-neutral-900 mb-6">Mindmaps</h1>
        <form onSubmit={handleCreate} className="flex items-center gap-3 max-w-md mb-6">
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              filter === "all"
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            All ({mindmaps.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("owned")}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              filter === "owned"
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            My mindmaps ({ownedCount})
          </button>
          {sharedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("shared")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                filter === "shared"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Shared with me ({sharedCount})
            </button>
          )}
        </div>
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

        <InvitationsPanel invitations={invitations} />

        <div className="grid gap-3">
          {filteredMindmaps.map((m) => {
            const isOptimistic = m.id < 0;
            const isOwned = currentUser ? m.owner_id === currentUser.id : true;
            return (
              <div
                key={m.id}
                className={`group flex items-center justify-between p-4 bg-white rounded-lg border border-neutral-200 transition-colors ${
                  isOptimistic
                    ? "opacity-60 cursor-wait"
                    : "hover:border-neutral-300 cursor-pointer"
                }`}
                onClick={() => !isOptimistic && router.push(`/mindmaps/${m.id}`)}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-neutral-900">
                    {m.title}
                    {isOptimistic && (
                      <span className="ml-2 text-xs text-neutral-400">Creating...</span>
                    )}
                    {!isOwned && (
                      <span className="ml-2 text-xs text-neutral-400">Shared</span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {m.node_count} node{m.node_count === 1 ? "" : "s"} · {m.total_collaborators} collaborator{m.total_collaborators === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-neutral-400 hidden sm:inline">
                    {new Date(m.created_at).toLocaleDateString()}
                  </span>
                  {!isOptimistic && isOwned && (
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
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredMindmaps.length === 0 && !loading && hasLoadedOnce && (
          <div className="text-sm text-neutral-500 mt-4">
            {filter === "all" && "No mindmaps yet. Create your first one above."}
            {filter === "owned" && "You haven't created any mindmaps yet."}
            {filter === "shared" && "No mindmaps have been shared with you."}
          </div>
        )}
      </div>
    </div>
  );
}


