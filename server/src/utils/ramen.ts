import { BaseNodeData, Node } from '../models/types.js';

export type EdgeDescriptor = {
  type: string;
  startUuid: string;
  endUuid: string;
};

/**
 * Infers the Neo4j relationship type and correct edge direction between a parent and child node
 * in the annotation/collection tree, based on their labels.
 *
 * The returned `startUuid` and `endUuid` reflect the Neo4j edge direction, which may differ from
 * the tree traversal order. For `PART_OF`, the tree parent is Collection but the edge runs
 * (Text|Collection)-[:PART_OF]->(Collection), so `startUuid` is the child and `endUuid` the parent.
 *
 * @param parent - The parent node in the tree traversal.
 * @param child - The child node in the tree traversal.
 * @returns An {@link EdgeDescriptor} with the relationship type and correctly-oriented UUIDs.
 * @throws If no relationship rule exists for the given label combination.
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

  // Annotation → Entity | Collection | Text: referenced nodes
  if (p.includes('Annotation')) {
    return { type: 'REFERS_TO', startUuid: parentUuid, endUuid: childUuid };
  }

  // Text | Collection → Annotation
  if (c.includes('Annotation')) {
    return { type: 'HAS_ANNOTATION', startUuid: parentUuid, endUuid: childUuid };
  }

  // Collection → Text | Collection → Collection: edge runs (Text|Collection)-[:PART_OF]->(Collection)
  if (p.includes('Collection') && (c.includes('Text') || c.includes('Collection'))) {
    return { type: 'PART_OF', startUuid: childUuid, endUuid: parentUuid };
  }

  throw new Error(`Cannot infer relationship between [${p.join(', ')}] and [${c.join(', ')}]`);
}
