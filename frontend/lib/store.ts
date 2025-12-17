import { create } from "zustand";
import {
  CurrentUser,
  MindMapListItem,
  NodeResponse,
  VoteResponse,
  InvitationResponse,
  CollaboratorListResponse,
} from "./types";
import { api } from "./api";

type MindmapState = {
  // States
  currentUser: CurrentUser | null;
  authReady: boolean;
  mindmaps: MindMapListItem[];
  nodesByMindmapId: Record<number, NodeResponse[]>;
  selectedNodeId: number | null;
  invitations: InvitationResponse[];
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentUser: (user: CurrentUser | null) => void;
  setSelectedNodeId: (id: number | null) => void;
  fetchMindmaps: () => Promise<void>;
  fetchMindmapNodes: (mindmapId: number) => Promise<void>;
  createMindmap: (title: string) => Promise<void>;
  deleteMindmap: (id: number) => Promise<void>;
  createNode: (input: {
    mindmapId: number;
    title: string;
    content?: string;
    parent_id: number;
  }) => Promise<number>;
  updateNode: (id: number, payload: Partial<Pick<NodeResponse, "title" | "content" | "x_position" | "y_position" | "parent_id" | "order_index">>) => Promise<void>;
  deleteNode: (id: number, mindmapId: number) => Promise<void>;
  toggleVote: (node: NodeResponse) => Promise<void>;
  fetchInvitations: () => Promise<void>;
  inviteCollaborator: (mindmapId: number, email: string, role: string) => Promise<void>;
  acceptInvitation: (invitationId: number) => Promise<void>;
  declineInvitation: (invitationId: number) => Promise<void>;
};

// Creating the Zustand store for the global mindmap state
export const useMindmapStore = create<MindmapState>((set, get) => ({
  currentUser: null,
  authReady: false,
  mindmaps: [],
  nodesByMindmapId: {},
  selectedNodeId: null,
  invitations: [],
  loading: false,
  error: null,

  setCurrentUser(user) {
    set({ currentUser: user, authReady: true });
  },

  setSelectedNodeId(id) {
    set({ selectedNodeId: id });
  },

  async fetchMindmaps() {
    set({ loading: true, error: null });
    try {
      const mindmaps = await api.listMindmaps();
      set({ mindmaps, loading: false });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load mindmaps", loading: false });
    }
  },

  async fetchMindmapNodes(mindmapId: number) {
    set({ loading: true, error: null });
    try {
      const nodes = await api.getMindmapNodes(mindmapId);
      set((state) => ({
        nodesByMindmapId: { ...state.nodesByMindmapId, [mindmapId]: nodes },
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load nodes", loading: false });
    }
  },

  async createMindmap(title: string) {
    set({ error: null });
    try {
      const { id } = await api.createMindmap({ title });
      await get().fetchMindmaps();
    } catch (err: any) {
      set({ error: err.message ?? "Failed to create mindmap" });
    }
  },

  async deleteMindmap(id: number) {
    set({ error: null });
    try {
      await api.deleteMindmap(id);
      set((state) => ({
        mindmaps: state.mindmaps.filter((m) => m.id !== id),
        nodesByMindmapId: Object.fromEntries(
          Object.entries(state.nodesByMindmapId).filter(
            ([key]) => Number(key) !== id
          )
        ),
      }));
    } catch (err: any) {
      set({ error: err.message ?? "Failed to delete mindmap" });
    }
  },

  async createNode(input) {
    const { mindmapId, parent_id, title, content } = input;
    set({ error: null });

    // Optimistic: create a temporary node in the UI immediately
    const tempId = Date.now();
    const state = get();
    const existing = state.nodesByMindmapId[mindmapId] ?? [];
    const parent = existing.find((n) => n.id === parent_id) ?? null;

    let x_position = 0;
    let y_position = 0;
    let order_index = existing.filter((n) => n.parent_id === parent_id).length;

    if (parent) {
      // Compute depth of parent from the root (parent_id === null)
      let depth = 0;
      let current: NodeResponse | undefined = parent;
      const MAX_DEPTH = 32;
      while (current && current.parent_id !== null && depth < MAX_DEPTH) {
        const next = existing.find((n) => n.id === current!.parent_id!) as | NodeResponse | undefined;
        if (!next) break;
        depth += 1;
        current = next;
      }

      const BASE_RADIUS = 300;
      const RADIUS_INCREMENT = 150;
      const ANGLES = [0, 180, 90, 270, 45, 135, 225, 315];

      const radius = BASE_RADIUS + depth * RADIUS_INCREMENT;
      const childrenPerShell = ANGLES.length;
      const shell = Math.floor(order_index / childrenPerShell);
      const angleIndex = order_index % childrenPerShell;
      const angleDeg = ANGLES[angleIndex];
      const angleRad = (angleDeg * Math.PI) / 180;
      const childRadius = radius + shell * 120;

      x_position = parent.x_position + childRadius * Math.cos(angleRad);
      y_position = parent.y_position + childRadius * Math.sin(angleRad);
    }

    const optimisticNode: NodeResponse = {
      id: tempId,
      mindmap_id: mindmapId,
      parent_id,
      title: title ?? "",
      content: content ?? "",
      x_position,
      y_position,
      order_index,
      is_ai_generated: false,
      vote_count: 0,
      user_votes: [],
      created_at: new Date().toISOString(),
    };

    // Insert optimistic node immediately
    set({
      nodesByMindmapId: {
        ...state.nodesByMindmapId,
        [mindmapId]: [...existing, optimisticNode],
      },
    });

    try {
      const created = await api.createNode(input);
      // When backend returns, replace optimistic node with real one.
      set((s) => {
        const list = s.nodesByMindmapId[mindmapId] ?? [];
        const withoutTemp = list.filter((n) => n.id !== tempId);
        // We don't yet know final layout positions here; they will be
        // refreshed via Supabase Realtime + fetchMindmapNodes.
        // For now, just ensure the real node exists in the list.
        const hasReal = withoutTemp.some((n) => n.id === created.id);
        const next = hasReal
          ? withoutTemp
          : [
              ...withoutTemp,
              {
                ...optimisticNode,
                id: created.id,
                mindmap_id: created.mindmap_id,
                x_position: created.x_position,
                y_position: created.y_position,
                order_index: created.order_index,
                created_at: created.created_at,
              },
            ];

        return {
          nodesByMindmapId: {
            ...s.nodesByMindmapId,
            [mindmapId]: next,
          },
        };
      });

      return created.id;
    } catch (err: any) {
      // Roll back optimistic node on failure
      set((s) => {
        const list = s.nodesByMindmapId[mindmapId] ?? [];
        return {
          nodesByMindmapId: {
            ...s.nodesByMindmapId,
            [mindmapId]: list.filter((n) => n.id !== tempId),
          },
          error: err.message ?? "Failed to create node",
        };
      });
      throw err;
    }
  },

  async updateNode(id, payload) {
    set({ error: null });
    try {
      const updated = await api.updateNode(id, payload);
      set((state) => {
        const mindmapId = updated.mindmap_id;
        const existing = state.nodesByMindmapId[mindmapId] ?? [];
        const next = existing.map((n) => (n.id === id ? updated : n));
        return {
          nodesByMindmapId: {
            ...state.nodesByMindmapId,
            [mindmapId]: next,
          },
        };
      });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to update node" });
    }
  },

  async deleteNode(id, mindmapId) {
    set({ error: null });
    try {
      await api.deleteNode(id);
      set((state) => {
        const existing = state.nodesByMindmapId[mindmapId] ?? [];
        return {
          nodesByMindmapId: {
            ...state.nodesByMindmapId,
            [mindmapId]: existing.filter((n) => n.id !== id),
          },
        };
      });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to delete node" });
    }
  },

  async toggleVote(node: NodeResponse) {
    set({ error: null });
    const hasVoted = get().currentUser
      ? node.user_votes.includes(get().currentUser!.id)
      : false;
    const mindmapId = node.mindmap_id;

    // Optimistic update
    set((state) => {
      const nodes = state.nodesByMindmapId[mindmapId] ?? [];
      const updatedNodes = nodes.map((n) => {
        if (n.id !== node.id) return n;
        const currentVotes = n.user_votes ?? [];

        const isAlready = state.currentUser ? currentVotes.includes(state.currentUser.id) : false;

        const nextUserVotes = state.currentUser
          ? isAlready
            ? currentVotes.filter((id) => id !== state.currentUser!.id)
            : [...currentVotes, state.currentUser.id]
          : currentVotes;

        const delta = state.currentUser
          ? isAlready
            ? -1
            : 1
          : 0;
          
        return {
          ...n,
          user_votes: nextUserVotes,
          vote_count: n.vote_count + delta,
        };
      });

      return {
        nodesByMindmapId: {
          ...state.nodesByMindmapId,
          [mindmapId]: updatedNodes,
        },
      };
    });

    try {
      let res: VoteResponse | { message: string };
      if (hasVoted) {
        res = await api.removeVoteFromNode(node.id);
      } else {
        res = await api.voteOnNode(node.id);
      }
    } catch (err: any) {
      set({ error: err.message ?? "Failed to toggle vote" });
    }
  },

  async fetchInvitations() {
    set({ loading: true, error: null });
    try {
      const invitations = await api.getMyInvitations();
      set({ invitations, loading: false });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load invitations", loading: false });
    }
  },

  async inviteCollaborator(mindmapId: number, email: string, role: string) {
    set({ error: null });
    try {
      await api.inviteCollaborator(mindmapId, { email, role });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to invite collaborator" });
    }
  },

  async acceptInvitation(invitationId: number) {
    set({ error: null });
    try {
      await api.acceptInvitation(invitationId);
      set((state) => ({
        invitations: state.invitations.filter((inv) => inv.id !== invitationId),
      }));
      await get().fetchMindmaps();
    } catch (err: any) {
      set({ error: err.message ?? "Failed to accept invitation" });
    }
  },

  async declineInvitation(invitationId: number) {
    set({ error: null });
    try {
      await api.declineInvitation(invitationId);
      set((state) => ({
        invitations: state.invitations.filter((inv) => inv.id !== invitationId),
      }));
    } catch (err: any) {
      set({ error: err.message ?? "Failed to decline invitation" });
    }
  },
}));
