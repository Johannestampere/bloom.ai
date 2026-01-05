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

    let order_index = existing.filter((n) => n.parent_id === parent_id).length;

    const computeFullLayout = (): Record<number, [number, number]> => {
      // Mirror backend layout constants from backend/app/utils/layout.py
      const BASE_RADIUS = 250;
      const RADIUS_INCREMENT = 180;
      const MIN_NODE_SPACING = 80;

      const virtualNewNode: NodeResponse = {
        id: tempId,
        mindmap_id: mindmapId,
        parent_id,
        title: title ?? "",
        content: content ?? "",
        x_position: 0,
        y_position: 0,
        order_index,
        is_ai_generated: false,
        vote_count: 0,
        user_votes: [],
        created_at: new Date().toISOString(),
      };

      const allNodes = [...existing, virtualNewNode];

      const nodesById: Record<number, NodeResponse> = {};
      const childrenMap: Record<number, NodeResponse[]> = {};

      for (const node of allNodes) {
        nodesById[node.id] = node;
        childrenMap[node.id] = [];
      }

      for (const node of allNodes) {
        if (node.parent_id !== null && childrenMap[node.parent_id]) {
          childrenMap[node.parent_id].push(node);
        }
      }

      for (const parentId of Object.keys(childrenMap)) {
        childrenMap[Number(parentId)].sort((a, b) => a.order_index - b.order_index);
      }

      const root = allNodes.find((n) => n.parent_id === null);
      if (!root) {
        if (parent) {
          return { [tempId]: [parent.x_position + BASE_RADIUS, parent.y_position] };
        }
        return { [tempId]: [0, 0] };
      }

      const depthMap: Record<number, number> = { [root.id]: 0 };
      const queue: NodeResponse[] = [root];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDepth = depthMap[current.id];

        for (const child of childrenMap[current.id] || []) {
          depthMap[child.id] = currentDepth + 1;
          queue.push(child);
        }
      }

      const subtreeSizes: Record<number, number> = {};

      const computeSubtreeSize = (nodeId: number): number => {
        let size = 1;
        for (const child of childrenMap[nodeId] || []) {
          size += computeSubtreeSize(child.id);
        }
        subtreeSizes[nodeId] = size;
        return size;
      };

      computeSubtreeSize(root.id);

      const wedges: Record<number, [number, number]> = {};
      const positions: Record<number, [number, number]> = {};

      positions[root.id] = [0, 0];
      wedges[root.id] = [0, 2 * Math.PI];

      const layoutQueue: NodeResponse[] = [root];

      while (layoutQueue.length > 0) {
        const parentNode = layoutQueue.shift()!;
        const [parentX, parentY] = positions[parentNode.id];
        const [parentStart, parentEnd] = wedges[parentNode.id];
        const childList = childrenMap[parentNode.id] || [];

        if (childList.length === 0) continue;

        const parentDepth = depthMap[parentNode.id];
        const radius = BASE_RADIUS + parentDepth * RADIUS_INCREMENT;

        let availableStart: number;
        let availableEnd: number;

        if (parentDepth === 0) {
          availableStart = 0;
          availableEnd = 2 * Math.PI;
        } else {
          const parentAngle = (parentStart + parentEnd) / 2;
          const spread = Math.min(parentEnd - parentStart, Math.PI);
          availableStart = parentAngle - spread / 2;
          availableEnd = parentAngle + spread / 2;
        }

        let availableRange = availableEnd - availableStart;

        const totalWeight = childList.reduce((sum, child) => sum + (subtreeSizes[child.id] || 1), 0);

        const minAnglePerChild = radius > 0 ? MIN_NODE_SPACING / radius : 0.1;
        const minTotalAngle = minAnglePerChild * childList.length;

        if (minTotalAngle > availableRange) {
          const extra = (minTotalAngle - availableRange) / 2;
          availableStart -= extra;
          availableEnd += extra;
          availableRange = availableEnd - availableStart;
        }

        let currentAngle = availableStart;

        for (const child of childList) {
          const childWeight = subtreeSizes[child.id] || 1;

          let childRange = (childWeight / totalWeight) * availableRange;

          childRange = Math.max(childRange, minAnglePerChild);

          const childStart = currentAngle;
          const childEnd = currentAngle + childRange;
          const childAngle = (childStart + childEnd) / 2;

          const childX = parentX + radius * Math.cos(childAngle);
          const childY = parentY + radius * Math.sin(childAngle);

          positions[child.id] = [childX, childY];
          wedges[child.id] = [childStart, childEnd];

          currentAngle = childEnd;
          layoutQueue.push(child);
        }
      }

      return positions;
    };

    const positions = computeFullLayout();

    const [x_position, y_position] = positions[tempId] ?? [0, 0];

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

    // Update ALL existing nodes with their new computed positions + add the new node
    const updatedNodes = existing.map((node) => {
      const newPos = positions[node.id];
      if (newPos) {
        return {
          ...node,
          x_position: newPos[0],
          y_position: newPos[1],
        };
      }
      return node;
    });

    set({
      nodesByMindmapId: {
        ...state.nodesByMindmapId,
        [mindmapId]: [...updatedNodes, optimisticNode],
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

        const idsToRemove = new Set<number>([id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const node of existing) {
            if (node.parent_id !== null && idsToRemove.has(node.parent_id) && !idsToRemove.has(node.id)) {
              idsToRemove.add(node.id);
              changed = true;
            }
          }
        }

        return {
          nodesByMindmapId: {
            ...state.nodesByMindmapId,
            [mindmapId]: existing.filter((n) => !idsToRemove.has(n.id)),
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
