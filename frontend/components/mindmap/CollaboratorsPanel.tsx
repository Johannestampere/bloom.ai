"use client";

import { useEffect, useState, FormEvent } from "react";
import { useMindmapStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { CollaboratorResponse } from "@/lib/types";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";

type CollaboratorsPanelProps = {
  mindmapId: number;
};

export function CollaboratorsPanel({ mindmapId }: CollaboratorsPanelProps) {
    const inviteCollaborator = useMindmapStore(
        (state) => state.inviteCollaborator
    );

    const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("editor");
    const [inviting, setInviting] = useState(false);

    const loadCollaborators = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.getCollaborators(mindmapId);
            setCollaborators(res.collaborators);
        } catch (err: any) {
            setError(err.message ?? "Failed to load collaborators");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCollaborators().catch(() => {});
    }, [mindmapId]);

    const handleInvite = async (e: FormEvent) => {
        e.preventDefault();
        const trimmed = email.trim();

        if (!trimmed) return;

        setInviting(true);
        setError(null);
        // eslint-disable-next-line no-unused-vars
        try {
            await inviteCollaborator(mindmapId, trimmed, role);
            setEmail("");
            await loadCollaborators();
        } catch (err: any) {
            setError(err.message ?? "Failed to invite collaborator");
        } finally {
            setInviting(false);
        }
    };

    return (
        <div className="h-full border-l border-neutral-200 bg-white p-4">
        <Panel title="Collaborators" className="h-full">
            <form onSubmit={handleInvite} className="mb-6 flex flex-col gap-3">
            <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700">
                Invite by email
                </label>
                <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={inviting}
                className="bg-neutral-50 border-neutral-200 focus:border-neutral-400"
                />
            </div>
            <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700">
                    Role
                </label>
                <select
                    className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-400"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={inviting}
                >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                </select>
            </div>
            <div className="flex justify-end pt-1">
                <button
                type="submit"
                disabled={!email.trim() || inviting}
                className="text-xs text-neutral-900 font-medium hover:text-neutral-600 transition-colors disabled:text-neutral-300"
                >
                Send invite
                </button>
            </div>
            </form>

            {loading && (
            <div className="text-xs text-neutral-400">Loading collaborators…</div>
            )}
            {error && (
            <div className="mb-2 text-xs text-red-500">{error}</div>
            )}

            {!loading && collaborators.length === 0 && (
            <div className="text-xs text-neutral-400">
                No collaborators yet.
            </div>
            )}

            {!loading && collaborators.length > 0 && (
            <div className="space-y-2 overflow-auto text-xs">
                {collaborators.map((c) => (
                <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5"
                >
                    <div className="flex flex-col">
                    <span className="font-medium text-neutral-900">
                        {c.user_email || c.user_name || c.user_id}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                        {c.role} · {c.status}
                    </span>
                    </div>
                </div>
                ))}
            </div>
            )}
        </Panel>
        </div>
    );
}


