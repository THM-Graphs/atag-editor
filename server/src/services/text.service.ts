import { int, QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import NotFoundError from '../errors/notFound.error.js';
import { NodeSearchParams, PaginationResult, TextNode, TextAccessObject } from '../models/types.js';
import { ancestryPaths } from '../utils/cypher.js';
import { toNativeTypes } from '../utils/helper.js';

export default class TextService {
  public async getTexts(collectionUuid: string): Promise<TextNode[]> {
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})

    CALL {
        WITH c
  
        OPTIONAL MATCH (c)<-[:PART_OF]-(tStart:Text)
        WHERE NOT ()-[:NEXT]->(tStart)
        OPTIONAL MATCH (tStart)-[:NEXT*]->(t:Text)

        WITH tStart, collect(t) AS nextTexts
        WITH coalesce(tStart, []) + nextTexts AS texts

        RETURN texts as texts
    }

    WITH c, texts

    RETURN [
            t IN texts | {
                nodeLabels: labels(t),
                data: t {.*}
            }
    ] AS texts
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid: collectionUuid });

    return result.records[0]?.get('texts');
  }

  /**
   * Retrieves extended data of a specified text node (Text node, corresponding Collection node and path to top-level Collection node).
   *
   * @param {string} uuid - The UUID of the text node to retrieve.
   * @throws {NotFoundError} If the text with the specified UUID is not found.
   * @return {Promise<TextAccessObject>} A promise that resolves to the retrieved extended text.
   */
  /**
   * Retrieves a paginated list of Text nodes whose `text` property contains the search string.
   *
   * @param {Required<NodeSearchParams>} options - Pagination and filter options (search, nodeLabels, order, limit, offset).
   * @return {Promise<PaginationResult<TextNode[]>>} A promise that resolves to a paginated result of Text nodes.
   */
  public async search(options: Required<NodeSearchParams>): Promise<PaginationResult<TextNode[]>> {
    const { nodeLabels, limit, order, offset, search } = options;

    const baseQuery: string = `
    MATCH (n:Text)
    WHERE toLower(n.text) CONTAINS toLower($search)
    AND (size($nodeLabels) = 0 OR size(apoc.coll.intersection($nodeLabels, labels(n))) > 0)

    WITH n
    ORDER BY n.text ASC
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
      }) as texts
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

    const rawData: TextNode[] = dataResult.records[0]?.get('texts') || [];
    const data: TextNode[] = rawData.map(t => toNativeTypes(t)) as TextNode[];

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

  public async getExtendedTextByUuid(uuid: string): Promise<TextAccessObject> {
    const query: string = `
    MATCH (t:Text {uuid: $uuid})
    OPTIONAL MATCH (t)-[:PART_OF]->(c:Collection)
    
    CALL (t) {
        ${ancestryPaths('t')}
    }

    RETURN {
        text: {
            nodeLabels: [l IN labels(t) WHERE l <> 'Text' | l],
            data: t {.*}
        },
        collection: CASE 
                        WHEN c IS NULL THEN null 
                        ELSE {
                            nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
                            data: c {.*}
                        }
                    END,
        paths: paths
    } as text
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const rawText: TextAccessObject = result.records[0]?.get('text');

    if (!rawText) {
      throw new NotFoundError(`Text with UUID ${uuid} not found`);
    }

    const text: TextAccessObject = toNativeTypes(rawText) as TextAccessObject;

    return text;
  }
}
