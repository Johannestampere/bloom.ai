export type MindMapListItem = {
  id: number;
  title: string;
  owner_id: string;
  node_count: number;
  total_collaborators: number;
  created_at: string;
};

export type NodeResponse = {
  id: number;
  mindmap_id: number;
  parent_id: number | null;
  title: string;
  content: string | null;
  x_position: number;
  y_position: number;
  order_index: number;
  is_ai_generated: boolean;
  vote_count: number;
  user_votes: string[];
  created_at: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  username: string;
};

export type VoteResponse = {
  user_id: string;
  node_id: number;
  created_at: string;
};

export type MindMapDetail = {
  id: number;
  title: string;
  owner_id: string;
  nodes: NodeResponse[];
  total_collaborators: number;
  created_at: string;
};

export type CollaboratorResponse = {
  id: number;
  mindmap_id: number;
  user_id: string;
  role: string;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  status: string;
  user_email?: string;
  user_name?: string;
};

export type InvitationResponse = {
  id: number;
  mindmap_id: number;
  mindmap_title: string;
  role: string;
  invited_by: string;
  inviter_name: string | null;
  inviter_email: string;
  invited_at: string;
  status: string;
};

export type CollaboratorListResponse = {
  collaborators: CollaboratorResponse[];
  total: number;
};

export type AISuggestion = {
  title: string;
  content?: string | null;
};

export type AISuggestionResponse = {
  suggestions: AISuggestion[];
};

