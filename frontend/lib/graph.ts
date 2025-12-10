import type { NodeResponse } from "./types";

export type GraphNode = {
  id: number;
  x: number;
  y: number;
  title: string;
  content: string | null;
  vote_count: number;
  is_ai_generated: boolean;
  parent_id: number | null;
  mindmap_id: number;
};

export type GraphEdge = {
  id: string;
  source: number;
  target: number;
};

export type Graph = {
  nodesById: Record<number, GraphNode>;
  edges: GraphEdge[];
};


export function buildGraph(nodes: NodeResponse[]): Graph {
  /*
  * Transform a flat NodeResponse[] into a graph-friendly structure:
  * - nodesById: keyed by node id with positions and metadata
  * - edges: parent->child relationships derived from parent_id
  */
  const nodesById: Record<number, GraphNode> = {};
  const edges: GraphEdge[] = [];

  for (const node of nodes) {
    nodesById[node.id] = {
      id: node.id,
      x: node.x_position,
      y: node.y_position,
      title: node.title,
      content: node.content,
      vote_count: node.vote_count,
      is_ai_generated: node.is_ai_generated,
      parent_id: node.parent_id,
      mindmap_id: node.mindmap_id,
    };
  }

  for (const node of nodes) {
    if (node.parent_id != null && nodesById[node.parent_id]) {
      edges.push({
        id: `${node.parent_id}-${node.id}`,
        source: node.parent_id,
        target: node.id,
      });
    }
  }

  return { nodesById, edges };
}


