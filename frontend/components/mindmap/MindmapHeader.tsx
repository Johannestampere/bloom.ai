"use client";

import { useEffect, useMemo, useState, useRef, KeyboardEvent } from "react";
import { useMindmapStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { MindMapDetail, CollaboratorResponse } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { AvatarStack } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type MindmapHeaderProps = {
    mindmapId: number;
    isCollaboratorsOpen: boolean;
    onToggleCollaborators: () => void;
    onLoadingChange?: (loading: boolean) => void;
    isHidden?: boolean;
    onToggleHidden?: () => void;
};

export function MindmapHeader({
    mindmapId,
    isCollaboratorsOpen,
    onToggleCollaborators,
    onLoadingChange,
    isHidden,
    onToggleHidden,
}: MindmapHeaderProps) {
    const currentUser = useMindmapStore((state) => state.currentUser);
    const nodesByMindmapId = useMindmapStore((state) => state.nodesByMindmapId);
    const fetchMindmaps = useMindmapStore((state) => state.fetchMindmaps);

    const [mindmap, setMindmap] = useState<MindMapDetail | null>(null);
    const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [titleInput, setTitleInput] = useState("");
    const titleRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);

        Promise.all([
            api.getMindmap(mindmapId),
            api.getCollaborators(mindmapId),
        ])
        .then(([mindmapData, collabData]) => {
            if (!mounted) return;
            setMindmap(mindmapData);
            setTitleInput(mindmapData.title);
            setCollaborators(collabData.collaborators);
            setLoading(false);
        })
        .catch((err: any) => {
            if (!mounted) return;
            setError(err.message ?? "Failed to load mindmap");
            setLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, [mindmapId]);

    useEffect(() => {
        onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    useEffect(() => {
        if (isEditing && titleRef.current) {
            titleRef.current.focus();
            titleRef.current.select();
        }
    }, [isEditing]);

    const nodeCount = useMemo(() => {
        const fromStore = nodesByMindmapId[mindmapId];
        if (fromStore) return fromStore.length;
        if (mindmap) return mindmap.nodes.length;
        return 0;
    }, [nodesByMindmapId, mindmapId, mindmap]);

    const collaboratorCount = mindmap?.total_collaborators ?? 0;

    // Build list of users for avatar display
    const avatarUsers = useMemo(() => {
        const users: Array<{ id: string; name?: string | null; email?: string | null }> = [];

        // Always add current user first
        if (currentUser) {
            users.push({
                id: currentUser.id,
                name: currentUser.username,
                email: currentUser.email,
            });
        }

        // Add accepted collaborators
        for (const collab of collaborators) {
            if (collab.status === "accepted" && !users.some(u => u.id === collab.user_id)) {
                users.push({
                    id: collab.user_id,
                    name: collab.user_name,
                    email: collab.user_email,
                });
            }
        }

        return users;
    }, [currentUser, collaborators]);

    const roleLabel = useMemo(() => {
        if (!mindmap || !currentUser) return null;
        return mindmap.owner_id === currentUser.id ? "Owner" : "Collaborator";
    }, [mindmap, currentUser]);

    const canEditTitle = useMemo(() => {
        if (!mindmap || !currentUser) return false;
        return mindmap.owner_id === currentUser.id;
    }, [mindmap, currentUser]);

    const startEditing = () => {
        if (!canEditTitle) return;
        setIsEditing(true);
    };
 
    const saveTitle = async () => {
        if (!mindmap || !canEditTitle) {
            setIsEditing(false);
            return;
        }

        const trimmed = titleInput.trim();

        if (!trimmed || trimmed === mindmap.title) {
            setTitleInput(mindmap.title);
            setIsEditing(false);
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const updated = await api.updateMindmap(mindmapId, { title: trimmed });
            setMindmap(updated);
            setTitleInput(updated.title);
            setIsEditing(false);
            await fetchMindmaps();
        } catch (err: any) {
            setError(err.message ?? "Failed to rename mindmap");
            setTitleInput(mindmap.title);
            setIsEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const handleTitleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            await saveTitle();
        } else if (e.key === "Escape") {
        if (mindmap) {
            setTitleInput(mindmap.title);
        }
        setIsEditing(false);
        }
    };

    return (
        <div className="border-b border-neutral-200 bg-white px-6 py-3">
            <div className="flex w-full items-center justify-between gap-4">
                {/* Left: stats + hide button */}
                <div className="flex w-48 items-center gap-3 text-xs text-neutral-500">
                    {onToggleHidden && (
                        <button
                            type="button"
                            onClick={onToggleHidden}
                            className="text-neutral-400 hover:text-neutral-900 transition-colors"
                            title="Hide header"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="18 15 12 9 6 15" />
                            </svg>
                        </button>
                    )}
                    {loading && <span>Loading…</span>}
                    {!loading && (
                        <span>
                            {nodeCount} node{nodeCount === 1 ? "" : "s"} · {collaboratorCount} collaborator{collaboratorCount === 1 ? "" : "s"}
                        </span>
                    )}
                </div>

                <div className="flex-1 flex justify-center">
                    {isEditing ? (
                        <Input
                            ref={titleRef}
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                            onBlur={saveTitle}
                            onKeyDown={handleTitleKeyDown}
                            disabled={saving}
                            className={cn(
                                "mx-auto w-full max-w-md border-none bg-transparent text-center text-base font-medium tracking-tight text-neutral-900 focus-visible:ring-0 focus-visible:border-0"
                            )}
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={startEditing}
                            className={cn(
                                "mx-auto block max-w-md truncate text-center text-base font-medium tracking-tight",
                                canEditTitle
                                    ? "text-neutral-900 hover:text-neutral-600"
                                    : "text-neutral-700 cursor-default"
                            )}
                        >
                            {mindmap ? mindmap.title : loading ? "Loading…" : "Mindmap"}
                        </button>
                    )}
                </div>

                {/* Right: avatars + collaborators */}
                <div className="flex w-48 flex-col items-end text-xs text-neutral-500">
                    <div className="flex items-center gap-3">
                        {avatarUsers.length > 0 && (
                            <AvatarStack users={avatarUsers} max={4} size="sm" />
                        )}
                        {roleLabel && <span>{roleLabel}</span>}
                        <button
                            type="button"
                            className={cn(
                                "text-xs transition-colors",
                                isCollaboratorsOpen
                                    ? "text-neutral-900 font-medium"
                                    : "text-neutral-500 hover:text-neutral-900"
                            )}
                            onClick={onToggleCollaborators}
                        >
                            Collaborators
                        </button>
                    </div>
                    {error && (
                        <span className="mt-1 max-w-xs text-right text-[10px] text-red-500">
                            {error}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}


