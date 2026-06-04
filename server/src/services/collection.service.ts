import { int, QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import { sortDirection } from '../utils/cypher.js';
import { ancestryPaths } from '../utils/cypher.js';
import { createCharactersFromText, toNativeTypes, toNeo4jTypes } from '../utils/helper.js';
import NotFoundError from '../errors/notFound.error.js';
import { IGuidelines } from '../models/IGuidelines.js';
import {
  CollectionAccessObject,
  PaginationResult,
  CollectionPostData,
  PropertyConfig,
  TextNode,
  CollectionNode,
  NodeAncestry,
  CollectionCreationData,
  CursorData,
  NodeSearchParams,
  NodeDto,
  NodeStatusObject,
  NodeUpdateObject,
} from '../models/types.js';
import { flattenNodeTree, buildSubgraphUpdateQuery } from '../utils/nodeUpdate.js';
import ICharacter from '../models/ICharacter.js';
import ValidationError from '../errors/validation.error.js';
import { ICollection } from '../models/ICollection.js';

type CollectionTextObject = {
  all: TextNode[];
  created: CreatedText[];
  deleted: TextNode[];
};

type CreatedText = TextNode & {
  characters: ICharacter[];
};

export default class CollectionService {
  /**
   * Retrieves the available labels that can be assigned to a Collection node.
   *
   * Called during creating and updating a collection to check the data validity (specifically, when no additional
   * node label is provided).
   *
   * @param {IGuidelines} guidelines - The guidelines to check against.
   * @return {string[]} The available labels.
   */
  private getAvailableCollectionLabelsFromGuidelines(guidelines: IGuidelines): string[] {
    return guidelines?.collections.types.map(collection => collection.additionalLabel) ?? [];
  }

  /**
   * Retrieves a paginated list of collections using cursor-based pagination.
   *
   * The scope of the query can be constrained by providing a UUID to fetch only Sub-Collections of a specific collection. Otherwise,
   * all top-level collections (= without outgoing PART_OF relationship) are fetched.
   * Additional labels for the collection nodes can be specified to filter the results. Pagination parameters such as sort order,
   * limit, and search string are also taken into account.
   *
   * @param {string[]} additionalLabels - The additional labels to match in the query, e.g., "Letter".
   * @param {string} order - The order in which to sort the collections ('ASC' or 'DESC').
   * @param {number} limit - The maximum number of collections to return.
   * @param {string} search - The search string to filter collections by their label.
   * @param {string | null} parentUuid - The UUID of the parent collection to restrict the scope to Sub-Collections, or null to fetch all.
   * @param {CursorData | null} cursor - The cursor for pagination, or null for the first page.
   *
   * @return {Promise<PaginationResult<CollectionNode[]>>} A promise that resolves to a paginated result of Collections.
   */
  public async getCollections(
    additionalLabels: string[],
    order: string,
    limit: number,
    search: string,
    parentUuid: string | null,
    cursor: CursorData | null = null,
  ): Promise<PaginationResult<NodeDto<CollectionNode>[]>> {
    // Defines the scope: If parent uuid is provided, fetch only subcollections of it. Else, fetch collections
    // that don't have a parent (top level collections)
    const baseCollectionSnippet = parentUuid
      ? `MATCH (parent:Collection {uuid: '${parentUuid}'})<-[:PART_OF]-(c:Collection)`
      : `MATCH (c:Collection) WHERE NOT EXISTS {
             (:Collection)<-[:PART_OF]-(c)
         }`;

    // Build cursor condition, depending on whether a cursor is provided or not
    const cursorCondition: string = cursor
      ? `AND (c.label ${sortDirection(order)} $cursorLabel OR (c.label = $cursorLabel AND c.uuid ${sortDirection(order)} $cursorUuid))`
      : '';

    // Base query: Add filters for nodeLabels and search string
    const baseQuery: string =
      baseCollectionSnippet +
      `
      ${parentUuid ? 'WHERE' : 'AND'}
      CASE
          WHEN size($additionalLabels) = 0 THEN size([l in labels(c) WHERE l <> 'Collection']) = 0
          ELSE apoc.coll.intersection($additionalLabels, labels(c))
      END
      AND
      toLower(c.label) CONTAINS toLower($search)
      `;

    // Count query: Get the total number of records matching the filters
    const countQuery: string = baseQuery + `RETURN count(c) AS totalRecords`;

    // Query for pagintation. Fetch limit + 1 to determine if there are more records
    const dataQuery: string =
      baseQuery +
      cursorCondition +
      `
      ORDER BY c.label ${order}, c.uuid ${order}
      LIMIT $limit

      RETURN collect({
          nodeLabels: labels(c),
          data: c {.*}
      }) AS collections
    `;

    const queryParams = {
      additionalLabels,
      search,
      limit: int(limit + 1),
      ...(cursor && {
        cursorLabel: cursor.label,
        cursorUuid: cursor.uuid,
      }),
    };

    const [countResult, dataResult] = await Promise.all([
      Neo4jDriver.runQuery(countQuery, queryParams),
      Neo4jDriver.runQuery(dataQuery, queryParams),
    ]);

    const totalRecords: number = countResult.records[0]?.get('totalRecords') || 0;
    const rawData: CollectionNode[] = dataResult.records[0]?.get('collections') || [];

    // Check if there are more records
    const hasMore: boolean = rawData.length > limit;
    const collections: CollectionNode[] = hasMore ? rawData.slice(0, limit) : rawData;

    const data: NodeDto<CollectionNode>[] = collections.map(c => ({
      node: {
        nodeLabels: c.nodeLabels,
        data: toNativeTypes(c.data) as ICollection,
      },
      connectedNodes: [] as NodeDto[],
    }));

    // Generate next cursor from the last item
    let nextCursor: CursorData | null = null;

    if (hasMore && data.length > 0) {
      const lastItem: NodeDto<CollectionNode> = data[data.length - 1];

      nextCursor = {
        label: lastItem.node.data.label,
        uuid: lastItem.node.data.uuid,
      };
    }

    return {
      data,
      pagination: {
        limit,
        order,
        search,
        totalRecords,
        nextCursor,
      },
    };
  }

  /**
   * Retrieves data of a specified collection node.
   *
   * @param {string} uuid - The UUID of the collection node to retrieve.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<NodeDto<CollectionNode>>} A promise that resolves to the retrieved collection.
   */
  public async getCollection(uuid: string): Promise<NodeDto<CollectionNode>> {
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})

    RETURN {
        nodeLabels: labels(c),
        data: c {.*}
    } AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const rawCollection: CollectionNode = result.records[0]?.get('collection');

    if (!rawCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    const collection: NodeDto<CollectionNode> = {
      node: toNativeTypes(rawCollection) as CollectionNode,
      connectedNodes: [],
    };

    return collection;
  }

  /**
   * Retrieves data of a specified collection node.
   *
   * @param {string} uuid - The UUID of the collection node to retrieve.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<NodeAncestry[]>} A promise that resolves to the retrieved collection.
   */

  /**
   * Retrieves the ancestry nodes of the node with the given UUID, i.e. the nodes that
   * are connected to the given node via PART_OF, HAS_ANNOTATION or
   * REFERS_TO relationships. This is used to determine the position of a node in the Collection/Text
   * network and create breadcrumb-like visualization and navigation in the frontend.
   *
   * @param {string} uuid - The UUID of the node to retrieve the ancestry for.
   * @return {Promise<NodeAncestry[]>} A promise that resolves to an array of node ancestries. Each node ancestry
   * is an array of node objects with their labels and properties.
   */
  public async getAncestry(uuid: string): Promise<NodeAncestry[]> {
    const query: string = `
    MATCH (c:Collection|Annotation|Text {uuid: $uuid})

    ${ancestryPaths('c')}
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const paths: NodeAncestry[] = result.records[0]?.get('paths');

    // TODO: Nested array, therefore this...fix within toNativeTypes function?
    return paths.map(p => p.map(node => toNativeTypes(node))) as NodeAncestry[];
  }

  /**
   * Retrieves collection node with given UUID together with connected text nodes. Annotation nodes will be retrieved 
   * by a separate query from the `AnnotationService`.
  
   * @param {string} uuid - The UUID of the collection node to retrieve.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<Omit<CollectionAccessObject, 'annotations' | 'collections'>>} A promise that resolves to the retrieved collection and text nodes, but not the annotations nodes.
   */
  public async getExtendedCollectionById(
    uuid: string,
  ): Promise<Omit<CollectionAccessObject, 'annotations' | 'collections'>> {
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})

    // Match optional Text nodes
    CALL (c) {
        OPTIONAL MATCH (c)<-[:PART_OF]-(t:Content)
        
        RETURN collect(t) as texts
    }

    WITH c, texts

    RETURN {
        collection: {
            nodeLabels: labels(c),
            data: c {.*}
        }, 
        texts: [
            t IN texts | {
                nodeLabels: labels(t),
                data: t {.*}
            }
        ]
    } AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const rawCollection: Omit<CollectionAccessObject, 'annotations' | 'collections'> =
      result.records[0]?.get('collection');

    if (!rawCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    const collection: Omit<CollectionAccessObject, 'annotations' | 'collections'> = toNativeTypes(
      rawCollection,
    ) as Omit<CollectionAccessObject, 'annotations' | 'collections'>;

    return collection;
  }

  /**
   * Checks if the given collection node is valid according to the guidelines. Specifically, it checks if
   * the collection node has an additional node label if options exist and if the "label" property is not
   * empty and does not consist of only whitespace characters.
   *
   * Called during creating and updating a collection.
   *
   * @param {CollectionNode} collection - The collection node to check for validity.
   * @param {IGuidelines} guidelines - The guidelines to check against.
   * @returns {void} This function does not return any value.
   * @throws {ValidationError} If the data is not valid according to the guidelines.
   */
  private checkValidity(collection: CollectionNode, guidelines: IGuidelines): void {
    const availableNodeLabels = this.getAvailableCollectionLabelsFromGuidelines(guidelines);

    // Collections must have and additional node label (if options exist)
    if (availableNodeLabels.length > 0 && collection.nodeLabels.length === 0) {
      throw new ValidationError('A Collection MUST have an additional node label.');
    }

    // Label property must always be a meaningful string
    const labelProp: string = collection.data.label;

    if (labelProp === '') {
      throw new ValidationError('The "label" property must not be empty.');
    }

    if (labelProp.trim() === '') {
      throw new ValidationError(
        'The "label" property must not consist of only whitespace characters.',
      );
    }
  }

  /**
   * Creates a new collection node with the given data and attaches it to a parent collection (optionally).
   *
   * While node labels and data of the collection node are mandatory, "texts" will always be an empty array
   * (not possibility to create on collection creation process) and "annotations" can be empty as well as with items.
   *
   * @param {CollectionCreationData} data - The data to set for the collection node.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<CollectionNode>} A promise that resolves to the created collection node.
   */
  public async createNewCollectionAlt(data: CollectionCreationData): Promise<CollectionNode> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    this.checkValidity(data.collection, guidelines);

    const fields: PropertyConfig[] = guidelineService.getCollectionConfigFieldsFromGuidelines(
      guidelines,
      data.collection.nodeLabels,
    );

    const collection: CollectionNode = {
      nodeLabels: [...data.collection.nodeLabels, 'Collection'],
      data: toNeo4jTypes(data.collection.data, fields),
    } as CollectionNode;

    const parentUuid: string | null = data.parentCollection?.data.uuid ?? null;

    let query: string = `
    CALL apoc.create.node($collection.nodeLabels, $collection.data) YIELD node as c
    `;

    // Connect it to the parent collection if it should
    if (data.parentCollection) {
      query += `
      MATCH (parent:Collection {uuid: $parentUuid})
      CREATE (c)-[:PART_OF]->(parent)
      `;
    }

    query += `
    RETURN {
        nodeLabels: labels(c),
        data: c {.*}
    } AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { collection, parentUuid });

    return result.records[0]?.get('collection');
  }

  public async createOrAddCollection(
    uuid: string,
    data: NodeStatusObject,
  ): Promise<NodeDto<CollectionNode>> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines = await guidelineService.getGuidelines();

    const flatNodeTree: NodeUpdateObject = flattenNodeTree(data, guidelines);

    const query: string = buildSubgraphUpdateQuery('Collection');

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      uuid,
      delete: flatNodeTree.delete,
      create: flatNodeTree.create,
      update: flatNodeTree.update,
      remove: flatNodeTree.remove,
      attach: flatNodeTree.attach,
    });

    const createdOrAddedCollection: CollectionNode = result.records[0]?.get('node');

    if (!createdOrAddedCollection) {
      throw new NotFoundError(`Could not add/create Collection with UUID ${uuid}`);
    }

    return {
      node: toNativeTypes(createdOrAddedCollection) as CollectionNode,
      connectedNodes: [],
    };
  }

  public processCollectionTextsBeforeSaving(data: CollectionPostData): CollectionTextObject {
    const newData: CollectionAccessObject = data.data;
    const initialData: CollectionAccessObject = data.initialData;

    const initialTextUuids: string[] = initialData.texts.map(t => t.data.uuid);
    const newTextUUids: string[] = newData.texts.map(t => t.data.uuid);

    const createdTexts: CreatedText[] = newData.texts
      .filter((text: TextNode) => !initialTextUuids.includes(text.data.uuid))
      .map((t: TextNode) => ({
        ...t,
        characters: createCharactersFromText(t.data.text),
      }));

    const deletedTexts: TextNode[] = initialData.texts.filter(
      text => !newTextUUids.includes(text.data.uuid),
    );

    const collectionTextObject: CollectionTextObject = {
      all: newData.texts,
      created: createdTexts,
      deleted: deletedTexts,
    };

    return collectionTextObject;
  }

  public async search(
    options: Required<NodeSearchParams>,
  ): Promise<PaginationResult<CollectionNode[]>> {
    const { nodeLabels, limit, order, offset, search } = options;

    const baseQuery: string = `
    MATCH (n:Collection)
    WHERE toLower(n.label) CONTAINS toLower($search)
    AND (size($nodeLabels) = 0 OR size(apoc.coll.intersection($nodeLabels, labels(n))) > 0)

    WITH n 
    ORDER BY n.label ASC 
    `;

    // Count query: Get the total number of records matching the filters
    const countQuery: string = baseQuery + `RETURN count(n) AS totalRecords`;

    const dataQuery: string =
      baseQuery +
      `
      SKIP $offset
      LIMIT $limit

      RETURN collect({
        nodeLabels: labels(n),
        data: n {.*}
      }) as collections
      
    `;

    const [countResult, dataResult] = await Promise.all([
      Neo4jDriver.runQuery(countQuery, {
        order,
        search,
        nodeLabels,
        offset: int(offset),
        limit: int(limit),
      }),
      Neo4jDriver.runQuery(dataQuery, {
        order,
        search,
        nodeLabels,
        offset: int(offset),
        limit: int(limit),
      }),
    ]);

    const totalRecords: number = countResult.records[0]?.get('totalRecords') || 0;

    const rawData: CollectionNode[] = dataResult.records[0]?.get('collections') || [];
    const data: CollectionNode[] = rawData.map(c => toNativeTypes(c)) as CollectionNode[];

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
   * Updates a Collection subgraph by flattening the provided {@link NodeStatusObject} tree
   * and executing a single CRUD query against the database. The top entry in the node tree
   * is the Collection node, the other nodes are the attached Text and Annotation nodes (and optionally,
   * their subnodes).
   *
   * @param uuid - UUID of the root Collection node to update.
   * @param root - Ownership tree rooted at the Collection node, with connected nodes (texts,
   *   annotations, sub-collections) already set as `connectedNodes`.
   * @throws {NotFoundError} If no Collection node with the given UUID exists after the update.
   * @returns The updated Collection node.
   */
  public async updateCollection(
    uuid: string,
    root: NodeStatusObject,
  ): Promise<NodeDto<CollectionNode>> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines = await guidelineService.getGuidelines();

    this.checkValidity(root.node as CollectionNode, guidelines);

    const flat = flattenNodeTree(root, guidelines);

    const query: string = buildSubgraphUpdateQuery('Collection');

    console.dir(flat, { depth: null });

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      uuid,
      delete: flat.delete,
      create: flat.create,
      update: flat.update,
      remove: flat.remove,
      attach: flat.attach,
    });

    const updatedNode: CollectionNode = result.records[0]?.get('node');

    if (!updatedNode) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return {
      node: updatedNode,
      connectedNodes: [],
    };
  }

  public async deleteCollection(uuid: string): Promise<NodeDto<CollectionNode>> {
    const query: string = `

    MATCH (c:Collection {uuid: $uuid})

    WITH c, {
        nodeLabels: labels(c),
        data: c {.*}
    } AS collectionToDelete

    // Delete annotations
    CALL (c) {
        OPTIONAL MATCH (c)-[:HAS_ANNOTATION]->(a:Annotation)
        DETACH DELETE a
    }

    // Delete texts, characters, and annotations
    CALL (c) {
        OPTIONAL MATCH (c)<-[:PART_OF]-(t:Content)
        
        OPTIONAL MATCH (t)-[:HAS_ANNOTATION]->(a:Annotation)
        OPTIONAL MATCH (t)-[:NEXT_CHARACTER*]->(ch:Character)

        DETACH DELETE t, a, ch
    }

    // Delete collection
    DETACH DELETE c

    RETURN collectionToDelete as collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const deletedCollection: CollectionNode = result.records[0]?.get('collection');

    if (!deletedCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return {
      node: toNativeTypes(deletedCollection) as CollectionNode,
      connectedNodes: [],
    };
  }
}
