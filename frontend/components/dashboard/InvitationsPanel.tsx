"use client";

import { useMindmapStore } from "@/lib/store";
import type { InvitationResponse } from "@/lib/types";

type InvitationsPanelProps = {
    invitations: InvitationResponse[];
};

export function InvitationsPanel({ invitations }: InvitationsPanelProps) {
    const acceptInvitation = useMindmapStore((state) => state.acceptInvitation);
    const declineInvitation = useMindmapStore((state) => state.declineInvitation);

    if (invitations.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-3">
                Pending Invitations
            </h2>
            <div className="grid gap-2">
                {invitations.map((inv) => (
                    <div
                        key={inv.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border border-neutral-200"
                    >
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-neutral-900">
                                {inv.mindmap_title}
                            </span>
                            <span className="text-xs text-neutral-500">
                                Invited by {inv.inviter_name || inv.inviter_email} as {inv.role}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => acceptInvitation(inv.id)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-700 transition-colors"
                            >
                                Accept
                            </button>
                            <button
                                type="button"
                                onClick={() => declineInvitation(inv.id)}
                                className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
