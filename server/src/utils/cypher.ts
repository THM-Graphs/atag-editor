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
