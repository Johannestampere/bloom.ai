import { MindMapListItem, NodeResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ||
  "http://localhost:3000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Request failed (${res.status} ${res.statusText}) for ${path}: ${text}`
    );
  }

  return (await res.json()) as T;
}

export const api = {
  // Mindmaps
  listMindmaps(): Promise<MindMapListItem[]> {
    return request<MindMapListItem[]>("/api/mindmaps");
  },

  createMindmap(payload: { title: string }): Promise<{ id: number }> {
    return request<{ id: number }>("/api/mindmaps", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteMindmap(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/mindmaps/${id}`, {
      method: "DELETE",
    });
  },

  getMindmapNodes(mindmapId: number): Promise<NodeResponse[]> {
    return request<NodeResponse[]>(`/api/mindmaps/${mindmapId}/nodes`);
  },

  createNode(input: {
    mindmapId: number;
    title: string;
    content?: string;
    parent_id: number;
  }): Promise<{ id: number; mindmap_id: number; x_position: number; y_position: number; order_index: number; created_at: string }> {
    const { mindmapId, ...body } = input;
    return request(`/api/mindmaps/${mindmapId}/nodes`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateNode(id: number, payload: Partial<Pick<NodeResponse, "title" | "content" | "x_position" | "y_position" | "parent_id" | "order_index">>): Promise<NodeResponse> {
    return request<NodeResponse>(`/api/nodes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteNode(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/nodes/${id}`, {
      method: "DELETE",
    });
  },

  // Voting
  voteOnNode(nodeId: number): Promise<VoteResponse> {
    return request<VoteResponse>(`/api/nodes/${nodeId}/vote`, {
      method: "POST",
    });
  },

  removeVoteFromNode(nodeId: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/nodes/${nodeId}/vote`, {
      method: "DELETE",
    });
  },
};

export type VoteResponse = {
  user_id: string;
  node_id: number;
  created_at: string;
};


