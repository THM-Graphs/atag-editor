import { int, QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import { EntityNode, NodeSearchParams, PaginationResult } from '../models/types.js';
import { toNativeTypes } from '../utils/helper.js';

export default class EntityService {
  /**
   * Retrieves a paginated list of Entity nodes whose `label` property contains the search string.
   *
   * @param {Required<NodeSearchParams>} options - Pagination and filter options (search, nodeLabels, order, limit, offset).
   * @return {Promise<PaginationResult<EntityNode[]>>} A promise that resolves to a paginated result of Entity nodes.
   */
  public async search(
    options: Required<NodeSearchParams>,
  ): Promise<PaginationResult<EntityNode[]>> {
    const { nodeLabels, limit, order, offset, search } = options;

    const baseQuery: string = `
    MATCH (n:Entity)
    WHERE toLower(n.label) CONTAINS toLower($search)
    AND (size($nodeLabels) = 0 OR size(apoc.coll.intersection($nodeLabels, labels(n))) > 0)

    WITH n
    ORDER BY n.label ASC
    `;

    const countQuery: string = baseQuery + `RETURN count(n) AS totalRecords`;

    const dataQuery: string =
      baseQuery +
      `
      SKIP $offset
      LIMIT $limit

      RETURN collect({
        nodeLabels: labels(n),
        data: n {.*}
      }) as entities
    `;

    const queryParams = {
      order,
      search,
      nodeLabels,
      offset: int(offset),
      limit: int(limit),
    };

    const [countResult, dataResult] = await Promise.all([
      Neo4jDriver.runQuery(countQuery, queryParams),
      Neo4jDriver.runQuery(dataQuery, queryParams),
    ]);

    const totalRecords: number = countResult.records[0]?.get('totalRecords') || 0;

    const rawData: EntityNode[] = dataResult.records[0]?.get('entities') || [];
    const data: EntityNode[] = rawData.map(e => toNativeTypes(e)) as EntityNode[];

    return {
      data,
      pagination: {
        limit,
        order,
        search,
        totalRecords,
        offset,
      },
    };
  }

  /**
   * Retrieves entities of a given node label that contain the search string in their `label` property.
   *
   * @param {string} nodeLabel - The node label to match, e.g. "ActorRole" or "Entity".
   * @param {string} searchStr - The search string to filter by.
   * @return {Promise<EntityNode[]>} A promise that resolves to an array of matching Entity nodes.
   */
  async searchByLabel(nodeLabel: string, searchStr: string): Promise<EntityNode[]> {
    const query: string = `
		MATCH (n:${nodeLabel})
    WHERE toLower(n.label) CONTAINS toLower($searchStr)
    WITH n ORDER BY n.label ASC
		RETURN collect({
      nodeLabels: [l IN labels(n) WHERE l <> 'Entity' | l],
      data: n {.*}
    }) as entities
		`;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { nodeLabel, searchStr });

    return result.records[0]?.get('entities');
  }
}
