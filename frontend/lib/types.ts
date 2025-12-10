export type MindMapListItem = {
  id: number;
  title: string;
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


