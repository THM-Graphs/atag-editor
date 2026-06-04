import { BaseNodeData, EdgeDescriptor, Node } from '../models/types.js';

/**
 * Given a parent and child node from a node tree, returns the Neo4j relationship type
 * and the correctly-directed `startUuid`/`endUuid` for that edge. Used for creating flat update information
 * when passing data of unknown tree-depth into the cypher query.
 *
 * The tree is always ownership-ordered: a Content owns its Annotations, a Collection owns its Content
 * and Annotations, and an Annotation owns its sub-annotations and referenced nodes. The relationship
 * type follows from the label pair, and the edge direction matches Neo4j conventions — which for
 * `PART_OF` means the child points to the parent: `(Content|Collection)-[:PART_OF]->(Collection)`.
 *
 * This function is only valid when called with trees structured in that ownership order. Passing
 * an inverted or flat structure will produce incorrect results. Currently this is only used when updating content via Editor.
 *
 * @param parent - The owner node (closer to the tree root).
 * @param child - The owned node (further from the tree root).
 * @returns An {@link EdgeDescriptor} with the relationship type and correctly-oriented UUIDs.
 *
 * @throws If the label combination has no known relationship rule.
 */
export function inferRelationship(
  parent: Node<BaseNodeData>,
  child: Node<BaseNodeData>,
): EdgeDescriptor {
  const parentUuid: string = (parent.data as BaseNodeData).uuid;
  const childUuid: string = (child.data as BaseNodeData).uuid;

  const p: string[] = parent.nodeLabels;
  const c: string[] = child.nodeLabels;

  // Annotation → Annotation: sub-annotation (e.g. commentary text)
  if (p.includes('Annotation') && c.includes('Annotation')) {
    return { type: 'HAS_ANNOTATION', startUuid: parentUuid, endUuid: childUuid };
  }

  // Annotation → Entity | Collection | Content: referenced nodes
  if (p.includes('Annotation')) {
    return { type: 'REFERS_TO', startUuid: parentUuid, endUuid: childUuid };
  }

  // Content | Collection → Annotation
  if (c.includes('Annotation')) {
    return { type: 'HAS_ANNOTATION', startUuid: parentUuid, endUuid: childUuid };
  }

  // Collection → Content | Collection → Collection: edge runs (Content|Collection)-[:PART_OF]->(Collection)
  if (p.includes('Collection') && (c.includes('Content') || c.includes('Collection'))) {
    return { type: 'PART_OF', startUuid: childUuid, endUuid: parentUuid };
  }

  throw new Error(`Cannot infer relationship between [${p.join(', ')}] and [${c.join(', ')}]`);
}
