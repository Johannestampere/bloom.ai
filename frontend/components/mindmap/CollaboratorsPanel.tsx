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

// Map backend error messages to user-friendly messages
function formatInviteError(message: string): string {
    if (message.includes("not found")) {
        return "No user found with this email. They need to sign up first.";
    }
    if (message.includes("cannot invite yourself")) {
        return "You can't invite yourself.";
    }
    if (message.includes("already the owner")) {
        return "This user is already the owner.";
    }
    if (message.includes("already a collaborator")) {
        return "This user is already a collaborator.";
    }
    if (message.includes("already been invited") || message.includes("pending")) {
        return "This user already has a pending invitation.";
    }
    return message;
}

export function CollaboratorsPanel({ mindmapId }: CollaboratorsPanelProps) {
    const inviteCollaborator = useMindmapStore(
        (state) => state.inviteCollaborator
    );

    const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("editor");
    const [inviting, setInviting] = useState(false);

    const loadCollaborators = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await api.getCollaborators(mindmapId);
            setCollaborators(res.collaborators);
        } catch (err: any) {
            setLoadError(err.message ?? "Failed to load collaborators");
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
        setInviteError(null);
        try {
            await inviteCollaborator(mindmapId, trimmed, role);
            setEmail("");
            await loadCollaborators();
        } catch (err: any) {
            const message = err.message ?? "Failed to invite collaborator";
            setInviteError(formatInviteError(message));
        } finally {
            setInviting(false);
        }
    };

    // Clear invite error when email changes
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (inviteError) {
            setInviteError(null);
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
                onChange={handleEmailChange}
                placeholder="name@example.com"
                disabled={inviting}
                className={`bg-neutral-50 border-neutral-200 focus:border-neutral-400 ${inviteError ? "border-red-300" : ""}`}
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
            <div className="flex flex-col items-end gap-2 pt-1">
                <button
                type="submit"
                disabled={!email.trim() || inviting}
                className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 transition-colors disabled:bg-neutral-50 disabled:text-neutral-300"
                >
                {inviting ? "Sending…" : "Send invite"}
                </button>
                {inviteError && (
                    <div className="text-xs text-red-500 text-right">
                        {inviteError}
                    </div>
                )}
            </div>
            </form>

            {loading && (
            <div className="text-xs text-neutral-400">Loading collaborators…</div>
            )}
            {loadError && (
            <div className="mb-2 text-xs text-red-500">{loadError}</div>
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
