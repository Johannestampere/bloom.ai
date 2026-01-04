"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMindmapStore } from "@/lib/store";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { CollaboratorResponse } from "@/lib/types";

type NodeSidePanelProps = {
  mindmapId: number;
  onOpenAISuggestions: () => void;
};

// This is the side panel that shows up when the user selects a node. 
// It allows the user to edit title and content, choose to add a child or delete the node, vote and see the voters.
export function NodeSidePanel({
  mindmapId,
  onOpenAISuggestions,
}: NodeSidePanelProps) {
  const nodesByMindmapId = useMindmapStore((state) => state.nodesByMindmapId);
  const selectedNodeId = useMindmapStore((state) => state.selectedNodeId);
  const updateNode = useMindmapStore((state) => state.updateNode);
  const toggleVote = useMindmapStore((state) => state.toggleVote);
   const deleteNode = useMindmapStore((state) => state.deleteNode);
   const setSelectedNodeId = useMindmapStore((state) => state.setSelectedNodeId);
  const currentUser = useMindmapStore((state) => state.currentUser);

  const nodes = nodesByMindmapId[mindmapId] ?? [];
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const titleRef = useRef<HTMLInputElement | null>(null);

  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
  const [loadingVoters, setLoadingVoters] = useState(true);
  const [votersError, setVotersError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingVoters(true);
    setVotersError(null);
    api
      .getCollaborators(mindmapId)
      .then((res) => {
        setCollaborators(res.collaborators);
      })
      .catch((err: any) => {
        setVotersError(err.message ?? "Failed to load voters");
      })
      .finally(() => {
        setLoadingVoters(false);
      });
  }, [mindmapId]);

  useEffect(() => {
    if (selectedNode) {
      setTitle(selectedNode.title ?? "");
      setContent(selectedNode.content ?? "");
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

  const hasVoted = useMemo(() => {
    if (!selectedNode || !currentUser) return false;
    return selectedNode.user_votes.includes(currentUser.id);
  }, [selectedNode, currentUser]);

  const voterLabels = useMemo(() => {
    if (!selectedNode) return [];
    return selectedNode.user_votes.map((userId) => {
      const collab = collaborators.find((c) => c.user_id === userId);
      let label = collab?.user_name || collab?.user_email || userId;
      if (currentUser && userId === currentUser.id) {
        label = `${label} (you)`;
      }
      return label;
    });
  }, [selectedNode, collaborators, currentUser]);

  const handleDelete = async () => {
    if (!selectedNode) return;
    const ok = window.confirm("Delete this node and all of its children?");
    if (!ok) return;
    await deleteNode(selectedNode.id, mindmapId);
    setSelectedNodeId(null);
  };

  if (!selectedNode) {
    return (
      <div className="h-full border-l border-[#3a4a5e] bg-[#465775] p-4 text-sm text-slate-200">
        Select a node to edit its details.
      </div>
    );
  }

  return (
    <div className="h-full border-l border-[#3a4a5e] bg-[#465775] p-4">
      <Panel title="Node details" className="flex h-full flex-col bg-[#3a4a5e]">
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-200">
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
            <label className="block text-xs font-medium text-slate-200">
              Content
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-[#2a3a4e] bg-white px-3 py-2 text-xs text-black outline-none focus:border-black focus:ring-0"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              placeholder="Node details"
            />
          </div>

          <div className="mt-1 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              className="h-7 px-3 text-[11px]"
              onClick={onOpenAISuggestions}
              disabled={!selectedNode}
            >
              AI suggestions
            </Button>
          </div>

          <div className="mt-2 space-y-1 border-t border-[#2a3a4e] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200">Votes</span>
              <Button
                type="button"
                variant="secondary"
                className="h-7 px-3 text-[11px]"
                onClick={() => toggleVote(selectedNode)}
                disabled={!currentUser}
              >
                {hasVoted ? "Unvote" : "Vote"} · {selectedNode.vote_count}
              </Button>
            </div>

            {loadingVoters && (
              <div className="text-[11px] text-slate-500">
                Loading voters…
              </div>
            )}
            {votersError && (
              <div className="text-[11px] text-red-300">{votersError}</div>
            )}

            {!loadingVoters && voterLabels.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[11px] text-slate-300">
                {voterLabels.map((label, index) => (
                  <li key={`${label}-${index}`}>{label}</li>
                ))}
              </ul>
            )}

            {!loadingVoters && voterLabels.length === 0 && (
              <div className="text-[11px] text-slate-500">No votes yet.</div>
            )}
          </div>

        </div>
        <div className="mt-3 border-t border-[#2a3a4e] pt-3">
          <Button
            type="button"
            variant="secondary"
            className="h-8 w-full px-3 text-[11px] text-red-300 border-red-500/60 hover:text-red-200 hover:border-red-400"
            onClick={handleDelete}
          >
            Delete node
          </Button>
        </div>
      </Panel>
    </div>
  );
}


