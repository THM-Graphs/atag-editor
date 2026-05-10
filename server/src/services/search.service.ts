import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import {
  BaseNodeLabel,
  CollectionNode,
  EntityNode,
  NodeSearchParams,
  PaginationResult,
  TextNode,
} from '../models/types.js';
import CollectionService from './collection.service.js';

export default class SearchService {
  /**
   * Searches for nodes of a given scope that match the provided search parameters.
   *
   * Delegates to the appropriate service based on the scope. Entity and Text scopes
   * are not yet implemented and return an empty result.
   *
   * @param {'Collection' | 'Entity' | 'Text'} scope - The type of nodes to search.
   * @param {Required<NodeSearchParams>} options - Pagination and filter options, including
   *   the search string, node labels, sort order, limit, and offset.
   * @return {Promise<PaginationResult<(CollectionNode | EntityNode | TextNode)[]>>} A promise
   *   that resolves to a paginated result containing the matching nodes.
   */
  public async searchNodes(
    scope: 'Collection' | 'Entity' | 'Text',
    options: Required<NodeSearchParams>,
  ): Promise<PaginationResult<(CollectionNode | EntityNode | TextNode)[]>> {
    if (scope === 'Collection') {
      const collectionService = new CollectionService();
      const data: PaginationResult<CollectionNode[]> = await collectionService.search(options);

      return data;
    } else {
      return {} as PaginationResult<(CollectionNode | EntityNode | TextNode)[]>;
    }
  }
}
