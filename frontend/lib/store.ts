import { create } from "zustand";
import type { CurrentUser, MindMapListItem, NodeResponse } from "./types";
import { api, type VoteResponse } from "./api";

type MindmapState = {
  // States
  currentUser: CurrentUser | null;
  mindmaps: MindMapListItem[];
  nodesByMindmapId: Record<number, NodeResponse[]>;
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentUser: (user: CurrentUser | null) => void;
  fetchMindmaps: () => Promise<void>;
  fetchMindmapNodes: (mindmapId: number) => Promise<void>;
  createMindmap: (title: string) => Promise<void>;
  deleteMindmap: (id: number) => Promise<void>;
  createNode: (input: { mindmapId: number; title: string; content?: string; parent_id: number }) => Promise<void>;
  updateNode: (id: number, payload: Partial<Pick<NodeResponse, "title" | "content" | "x_position" | "y_position" | "parent_id" | "order_index">>) => Promise<void>;
  deleteNode: (id: number, mindmapId: number) => Promise<void>;
  toggleVote: (node: NodeResponse) => Promise<void>;
};

// Creating the Zustand store for the global mindmap state
export const useMindmapStore = create<MindmapState>((set, get) => ({
  currentUser: null,
  mindmaps: [],
  nodesByMindmapId: {},
  loading: false,
  error: null,

  setCurrentUser(user) {
    set({ currentUser: user });
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
    const { mindmapId } = input;
    set({ error: null });
    try {
      const created = await api.createNode(input);
      // After creation, re-fetch nodes to get the full NodeResponse set with layout applied
      await get().fetchMindmapNodes(mindmapId);
    } catch (err: any) {
      set({ error: err.message ?? "Failed to create node" });
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
}));


