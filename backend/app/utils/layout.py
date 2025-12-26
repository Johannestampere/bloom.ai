# This is where the backend calculates the layout of the nodes in the mindmap.
# Every time a node is created, deleted, or moved, the entire layout must be recomputed
# to maintain a consistent, balanced visual tree structure across all clients.

# load_tree: load all nodes belonging to a given mindmap and prepare them for layout computation
# compute_layout: compute the canonical (x, y) coordinates for every node in the mindmap
# apply_layout: persist the computed layout positions into the database

from typing import Dict, Tuple, Any, List
from sqlalchemy.orm import Session
from ..models import Node
import math

ANGLES = [0, 90, 45, 135, 225, 315]
BASE_RADIUS = 300 # distance for depth = 1 nodes
RADIUS_INCREMENT = 150 # each deeper level adds 150 in radius

def load_tree(db: Session, mindmap_id: int) -> Any:
    """
    Load all nodes in a mindmap and build a full parent->children tree structure.

    This function prepares the hierarchical representation required by the layout engine. It will:

        1. Fetch all nodes for the given mindmap
        2. Identify the root node (the one with parent_id = None)
        3. Build an adjacency structure of the form:
            {
                root_id: [child_node_1, child_node_2, ...],
                child_node_1_id: [...],
                ...
            }
       4. Include metadata such as:
            - sibling order via order_index
            - a direct reference to the root node object

    The returned structure is what compute_layout() will use to produce (x, y) coordinates,
    since tree-based layout algorithms require knowing the full hierarchy of parents
    and children.
    """
    nodes: List[Node] = db.query(Node).filter(Node.mindmap_id == mindmap_id).all()

    if not nodes:
        return {
            "root": None,
            "children": {},
            "depth": {},
            "nodes": {}
        }
    
    nodes_by_id: Dict[int, Node] = {node.id: node for node in nodes}
    root = next((node for node in nodes if node.parent_id is None), None)

    if not root:
        raise ValueError("No root node found for mindmap")
    
    children: Dict[int, List[Node]] = {node.id: [] for node in nodes}

    for node in nodes:
        if node.parent_id is not None:
            children[node.parent_id].append(node)

    for parent_id in children:
        children[parent_id].sort(key=lambda n: n.order_index)
    
    depth: Dict[int, int] = {root.id: 0}
    queue = [root]

    while queue:
        current = queue.pop(0)
        current_depth = depth[current.id]

        for child in children[current.id]:
            depth[child.id] = current_depth + 1
            queue.append(child)

    # Return full tree structure
    return {
        "root": root,
        "children": children,
        "depth": depth,
        "nodes": nodes_by_id
    }

def compute_layout(tree: Any) -> Dict[int, Tuple[float, float]]:
    """
    Compute the canonical (x, y) coordinates for every node in the mindmap.

    Input:
        The output of load_tree(), containing a full hierarchy (root node, children mapping, depth info, etc)

    Output:
        A dictionary mapping: node_id -> (x_position, y_position)

    Will prolly become Reingold-Tilford later but im just gonna use a simple layout algo for now

    For correctness, layout must be recalculated for the entire mindmap every time,
    because adding one node can shift siblings, subtrees, or even global spacing.
    """
    if not tree or tree["root"] is None:
        return {}
    
    root = tree["root"]
    children = tree["children"]
    depth_map = tree["depth"]

    # Absolute positions of each node in the global canvas coordinate system.
    positions: Dict[int, Tuple[float, float]] = {}
    
    # Absolute outward angle for each node, ie the direction
    # from its parent to the node in global space. The root defines the origin
    # of the angular frame and is treated as pointing to 0 degrees.
    directions: Dict[int, float] = {}

    positions[root.id] = (0.0, 0.0)
    directions[root.id] = 0.0

    queue = [root]

    while queue:
        parent = queue.pop(0)
        parent_x, parent_y = positions[parent.id]
        parent_angle = directions.get(parent.id, 0.0)
        child_list = children[parent.id]

        if not child_list:
            continue
            
        parent_depth = depth_map[parent.id]

        radius = BASE_RADIUS + parent_depth * RADIUS_INCREMENT

        children_per_shell = len(ANGLES)

        for index, child in enumerate(child_list):
            shell = index // children_per_shell
            angle_index = index % children_per_shell
            # Compute this child's angle in the local frame of the parent,
            # then rotate it by the parent's absolute direction so that
            # 0 deg always means further out from the parent in global space.
            local_angle_deg = ANGLES[angle_index]
            angle_deg = (parent_angle + local_angle_deg) % 360
            angle_rad = math.radians(angle_deg)

            child_radius = radius + shell * 120

            child_x = parent_x + child_radius * math.cos(angle_rad)
            child_y = parent_y + child_radius * math.sin(angle_rad)

            positions[child.id] = (child_x, child_y)
            # Store this child's absolute outward direction so that its own
            # children can be arranged relative to it in the next level
            directions[child.id] = angle_deg

            queue.append(child)

    return positions


def apply_layout(db: Session, positions: Dict[int, Tuple[float, float]]) -> None:
    """
    Persist the computed layout positions into the database.

    Input:
        A dict mapping node_id -> (x, y) produced by compute_layout()

    This function will:
      - Iterate through every node included in 'positions'
      - Update Node.x_position and Node.y_position fields in the database
      - Commit these changes so that:
          * Supabase Realtime can broadcast updates to all clients
          * The frontend always renders the same canonical layout
    """
    if not positions:
        return

    for node_id, (x, y) in positions.items():
        db.query(Node).filter(Node.id == node_id).update(
            {
                Node.x_position: x,
                Node.y_position: y,
            },
            synchronize_session=False,
        )
    
    # we commit the changes after calling this function, externally

