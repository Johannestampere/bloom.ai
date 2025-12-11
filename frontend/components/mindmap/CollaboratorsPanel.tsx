"use client";

import { useEffect, useState, FormEvent } from "react";
import { useMindmapStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { CollaboratorResponse } from "@/lib/types";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type CollaboratorsPanelProps = {
  mindmapId: number;
};

export function CollaboratorsPanel({ mindmapId }: CollaboratorsPanelProps) {
    const { inviteCollaborator } = useMindmapStore((state) => ({
        inviteCollaborator: state.inviteCollaborator,
    }));

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
        <div className="h-full border-l border-slate-800 bg-slate-900/60 p-4">
        <Panel title="Collaborators" className="h-full bg-slate-900/80">
            <form onSubmit={handleInvite} className="mb-4 flex flex-col gap-2">
            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                Invite collaborator by email
                </label>
                <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={inviting}
                />
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                    Role
                </label>
                <select
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-100 outline-none focus:border-emerald-400"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={inviting}
                >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                </select>
            </div>
            <div className="flex justify-end pt-1">
                <Button
                type="submit"
                disabled={!email.trim() || inviting}
                className="text-xs"
                >
                Send invite
                </Button>
            </div>
            </form>

            {loading && (
            <div className="text-xs text-slate-400">Loading collaborators…</div>
            )}
            {error && (
            <div className="mb-2 text-xs text-red-300">{error}</div>
            )}

            {!loading && collaborators.length === 0 && (
            <div className="text-xs text-slate-400">
                No collaborators yet. Invite someone using the form above.
            </div>
            )}

            {!loading && collaborators.length > 0 && (
            <div className="mt-1 space-y-2 overflow-auto text-xs">
                {collaborators.map((c) => (
                <div
                    key={c.id}
                    className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2"
                >
                    <div className="flex flex-col">
                    <span className="font-medium text-slate-100">
                        {c.user_email || c.user_name || c.user_id}
                    </span>
                    <span className="text-[11px] text-slate-400">
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


