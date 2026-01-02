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

BASE_RADIUS = 250
RADIUS_INCREMENT = 180
MIN_NODE_SPACING = 80

def load_tree(db: Session, mindmap_id: int) -> Any:
    """Load all nodes in a mindmap and build a full parent->children tree structure.
    The returned structure is what compute_layout() will use to produce (x, y) coordinates,
    since tree-based layout algorithms require knowing the full hierarchy of parents
    and children."""
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

def _compute_subtree_sizes(node_id: int, children: Dict[int, List[Any]]) -> Dict[int, int]:
    """Compute the size of each subtree (number of descendant nodes + 1 for the node itself).
    Larger subtrees need more angular space in the radial layout."""
    sizes: Dict[int, int] = {}

    def dfs(node_id: int) -> int:
        size = 1
        for child in children[node_id]:
            size += dfs(child.id)
        sizes[node_id] = size
        return size

    dfs(node_id)
    return sizes


def compute_layout(tree: Any) -> Dict[int, Tuple[float, float]]:
    """
    Compute the canonical (x, y) coordinates for every node using a radial tree layout.

    Algorithm:
        1. Compute subtree sizes for each node (used to allocate angular space)
        2. Root is placed at origin (0, 0) and owns the full 360 deg circle
        3. Each node's children are allocated areas proportional to their subtree size
        4. Children are placed at the center of their area, at a fixed radius from parent
        5. Each child inherits a narrower angular range to distribute to its own children
    """
    if not tree or tree["root"] is None:
        return {}

    root = tree["root"]
    children = tree["children"]
    depth_map = tree["depth"]

    subtree_sizes = _compute_subtree_sizes(root.id, children)

    positions: Dict[int, Tuple[float, float]] = {}

    # Each node is assigned an angular wedge: (start_angle, end_angle) in radians
    # The node is positioned at the center of its wedge
    wedges: Dict[int, Tuple[float, float]] = {}

    positions[root.id] = (0.0, 0.0)
    wedges[root.id] = (0.0, 2 * math.pi)

    queue = [root]

    while queue:
        parent = queue.pop(0)
        parent_x, parent_y = positions[parent.id]
        parent_start, parent_end = wedges[parent.id]
        child_list = children[parent.id]

        if not child_list:
            continue

        parent_depth = depth_map[parent.id]
        radius = BASE_RADIUS + parent_depth * RADIUS_INCREMENT

        # For root's children, use the full circle
        # For deeper nodes, use the parent's wedge
        if parent_depth == 0:
            available_start = 0.0
            available_end = 2 * math.pi
        else:
            # Children spread within a cone extending from the parent's direction
            parent_angle = (parent_start + parent_end) / 2
            spread = min((parent_end - parent_start), math.pi)  # Max 180 deg spread for children
            available_start = parent_angle - spread / 2
            available_end = parent_angle + spread / 2

        available_range = available_end - available_start

        # Calculate total subtree weight for proportional distribution
        total_weight = sum(subtree_sizes[child.id] for child in child_list)

        # Ensure minimum angular spacing between nodes
        min_angle_per_child = MIN_NODE_SPACING / radius if radius > 0 else 0.1
        min_total_angle = min_angle_per_child * len(child_list)

        # If we need more space than available, expand the range
        if min_total_angle > available_range:
            extra = (min_total_angle - available_range) / 2
            available_start -= extra
            available_end += extra
            available_range = available_end - available_start

        current_angle = available_start

        for child in child_list:
            child_weight = subtree_sizes[child.id]

            # Allocate angular space proportional to subtree size
            child_range = (child_weight / total_weight) * available_range

            # Ensure minimum spacing
            child_range = max(child_range, min_angle_per_child)

            child_start = current_angle
            child_end = current_angle + child_range
            child_angle = (child_start + child_end) / 2

            child_x = parent_x + radius * math.cos(child_angle)
            child_y = parent_y + radius * math.sin(child_angle)

            positions[child.id] = (child_x, child_y)
            wedges[child.id] = (child_start, child_end)

            current_angle = child_end
            queue.append(child)

    return positions


def apply_layout(db: Session, positions: Dict[int, Tuple[float, float]]) -> None:
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

