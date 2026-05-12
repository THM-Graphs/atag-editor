import { int, QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import NotFoundError from '../errors/notFound.error.js';
import {
  NodeSearchParams,
  NodeStatusObject,
  PaginationResult,
  TextNode,
  TextAccessObject,
  TextUpdateDto,
  NodeUpdateObject,
  PropertyConfig,
  Node,
  EntityNode,
  AnnotationNode,
  CollectionNode,
} from '../models/types.js';
import { ancestryPaths } from '../utils/cypher.js';
import { toNativeTypes, toNeo4jTypes } from '../utils/helper.js';
import { inferRelationship } from '../utils/ramen.js';
import GuidelinesService from './guidelines.service.js';
import { IGuidelines } from '../models/IGuidelines.js';
import { IAnnotation } from '../models/IAnnotation.js';

export default class TextService {
  private guidelines: IGuidelines | null = null;

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

  /**
   * Retrieves extended data of a specified text node (Text node, corresponding Collection node and path to top-level Collection node).
   *
   * @param {string} uuid - The UUID of the text node to retrieve.
   * @throws {NotFoundError} If the text with the specified UUID is not found.
   * @return {Promise<TextAccessObject>} A promise that resolves to the retrieved extended text.
   */
  public async getExtendedTextByUuid(uuid: string): Promise<TextAccessObject> {
    const query: string = `
    MATCH (t:Text {uuid: $uuid})
    OPTIONAL MATCH (t)-[:PART_OF]->(c:Collection)
    
    CALL (t) {
        ${ancestryPaths('t')}
    }

    RETURN {
        text: {
            nodeLabels: labels(t),
            data: t {.*}
        },
        collection: CASE 
                        WHEN c IS NULL THEN null 
                        ELSE {
                            nodeLabels: labels(c),
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

  public async updateText(uuid: string, data: TextUpdateDto): Promise<TextNode> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    this.guidelines = await guidelineService.getGuidelines();

    const flatNodeTree: NodeUpdateObject = this.flattenNodeTree(data);

    const query: string = `
    // Delete nodes and their relationships
    CALL () {
        UNWIND $delete AS nodeToDelete

        MATCH (n {uuid: nodeToDelete.data.uuid})

        DETACH DELETE n
    }

    // Create new nodes with dynamic labels
    CALL () {
        UNWIND $create AS nodeToCreate

        CREATE (n)
        SET n = nodeToCreate.data
        WITH n, nodeToCreate
        CALL apoc.create.addLabels(n, nodeToCreate.nodeLabels) YIELD node

        RETURN count(node) AS created
    }

    // Update properties and labels of existing nodes
    CALL () {
        UNWIND $update AS nodeToUpdate

        MATCH (n:Annotation|Text|Collection|Entity {uuid: nodeToUpdate.data.uuid})
        SET n = nodeToUpdate.data
        WITH n, nodeToUpdate, labels(n) AS currentLabels
        CALL apoc.create.removeLabels(n, currentLabels) YIELD node
        CALL apoc.create.addLabels(node, nodeToUpdate.nodeLabels) YIELD node AS updatedNode
        RETURN count(updatedNode) AS updated
    }

    // Remove relationships
    CALL () {
        UNWIND $remove AS edge

        MATCH (start:Annotation|Text|Collection|Entity {uuid: edge.startUuid})-[r]->(end:Annotation|Text|Collection|Entity {uuid: edge.endUuid})
        WHERE type(r) = edge.type

        DELETE r
    }

    // Create relationships with dynamic type
    CALL () {
        UNWIND $attach AS edge

        MATCH (start:Annotation|Text|Collection|Entity {uuid: edge.startUuid})
        MATCH (end:Annotation|Text|Collection|Entity {uuid: edge.endUuid})
        CALL apoc.merge.relationship(start, edge.type, {}, {}, end) YIELD rel

        RETURN count(rel) AS attached
    }

    // Finally, match text node and return it
    MATCH (t:Text {uuid: $uuid})

    RETURN {
        nodeLabels: labels(t),
        data: t {.*}
    } AS text
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      uuid,
      delete: flatNodeTree.delete,
      create: flatNodeTree.create,
      update: flatNodeTree.update,
      remove: flatNodeTree.remove,
      attach: flatNodeTree.attach,
    });

    const updatedText: TextNode = result.records[0]?.get('text');

    if (!updatedText) {
      throw new NotFoundError(`Text with UUID ${uuid} not found`);
    }

    return toNativeTypes(updatedText) as TextNode;
  }

  private convertNodeToNeo4jFormat(
    node: EntityNode | AnnotationNode | CollectionNode | TextNode,
  ): Node<Record<string, any>> {
    const guidelineService = new GuidelinesService();
    const fields: PropertyConfig[] = [];

    // Text nodes currently only hold string properties -> no problem.
    // Entity nodes do not have a configuration, but should not be edited from the editor anyway
    if (node.nodeLabels.includes('Text') || node.nodeLabels.includes('Entity')) {
      return node;
    } else if (node.nodeLabels.includes('Collection')) {
      const collectionConfigFields: PropertyConfig[] =
        guidelineService.getCollectionConfigFieldsFromGuidelines(this.guidelines!, node.nodeLabels);

      fields.push(...collectionConfigFields);
    } else if (node.nodeLabels.includes('Annotation')) {
      const annotationConfigFields: PropertyConfig[] =
        guidelineService.getAnnotationConfigFieldsFromGuidelines(
          this.guidelines!,
          (node.data as IAnnotation).type,
        );

      fields.push(...annotationConfigFields);
    } else {
      return node;
    }

    const convertedNode: Node<Record<string, any>> = {
      nodeLabels: node.nodeLabels,
      data: toNeo4jTypes(node.data, fields),
    };

    return convertedNode;
  }

  private insertNodeIntoObject(
    parent: NodeStatusObject | null,
    node: NodeStatusObject,
    obj: NodeUpdateObject,
  ): NodeUpdateObject {
    node.connectedNodes.forEach(child => this.insertNodeIntoObject(node, child, obj));

    if (node.meta.status === 'deleted') {
      obj.delete.push(node.node);
    }

    if (node.meta.status === 'created') {
      obj.create.push(this.convertNodeToNeo4jFormat(node.node));
    }

    if (node.meta.status === 'modified') {
      obj.update.push(this.convertNodeToNeo4jFormat(node.node));
    }

    // Added/created with existing parent
    if (parent && (node.meta.status === 'created' || node.meta.status === 'added')) {
      obj.attach.push(inferRelationship(parent.node, node.node));
    }

    // Removed, but parent was deleted anyway
    if (parent && node.meta.status === 'removed' && parent.meta.status !== 'deleted') {
      obj.remove.push(inferRelationship(parent.node, node.node));
    }

    return obj;
  }

  private flattenNodeTree(textDto: TextUpdateDto): NodeUpdateObject {
    const obj: NodeUpdateObject = {
      create: [],
      delete: [],
      update: [],
      remove: [],
      attach: [],
    };

    this.insertNodeIntoObject(null, { ...textDto.text, connectedNodes: textDto.annotations }, obj);

    return obj;
  }
}
