/**
 * Maps a URL sort directive used for sorting collections to a Cypher statement. This is currently needed since
 * the sorting can apply to a Collection's property (label etc.) or to a count of related nodes (texts, annotations, collections etc.)
 *
 * @param {string} sortField - The sort field to be mapped.
 * @return {string} The corresponding Cypher statement.
 */
export function collectionSortField(sortField: string): string {
  if (sortField === 'collections') {
    return 'collectionCount';
  } else if (sortField === 'texts') {
    return 'textCount';
  } else if (sortField === 'annotations') {
    return 'annotationCount';
  } else {
    return 'c.' + sortField;
  }
}

/**
 * Generates a Cypher query to fetch the ancestry of a node. The ancestry is the path from the root node (the top-most Collection node)
 * to the given node. The result is an array of node objects with their labels and properties.
 *
 * @param {string} nodeAlias - The alias of the node to fetch the ancestry for.
 *
 * @return {string} The Cypher query as a string.
 */
export function ancestryPaths(nodeAlias: string): string {
  // TODO: maxLevel 50 should be enough, but change maybe?
  // TODO: What if circular matches happen? uniqueness should filter that
  // TODO: Makes aktually no sense to do this as snippet, create own method for it (network service)?
  return `
  CALL apoc.path.expandConfig(${nodeAlias}, {
      relationshipFilter: 'PART_OF>|HAS_ANNOTATION<|REFERS_TO<',
      labelFilter: 'Collection|Annotation|Text',
      maxLevel: 50,
      uniqueness: 'NODE_PATH'
  }) YIELD path

  WITH path, last(nodes(path)) AS topNode

  // Keep only "longest paths" (which have Collections above the or annotations that reference it)
  WHERE
      NOT (topNode)-[:PART_OF]->() AND
      NOT ()-[:REFERS_TO]->(topNode) AND 
      NOT ()-[:HAS_ANNOTATION]->(topNode)

  RETURN collect([
      n IN reverse(tail(nodes(path))) | {
          nodeLabels: labels(n), 
          data: n {.*}
      }
  ]) as paths
  `;
}
