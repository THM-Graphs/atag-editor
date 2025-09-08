import { int, QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import { collectionSortField } from '../utils/cypher.js';
import { toNativeTypes, toNeo4jTypes } from '../utils/helper.js';
import NotFoundError from '../errors/not-found.error.js';
import ICollection from '../models/ICollection.js';
import { IGuidelines } from '../models/IGuidelines.js';
import {
  CollectionAccessObject,
  PaginationResult,
  CollectionPostData,
  PropertyConfig,
  Text,
  Collection,
  CollectionPreview,
  NodeAncestry,
  CollectionCreationData,
} from '../models/types.js';

type CollectionTextObject = {
  all: Text[];
  created: Text[];
  deleted: Text[];
};

export default class CollectionService {
  /**
   * Retrieves a paginated list of collection preview objects. These objects include the properties and labels of
   * the `Collection` node as well as counts of connected `Annotation`, `Text`, and `Collection` nodes. Be aware that only Sub-Collections are included in the
   * collection count (= incoming `PART_OF` relationships).
   *
   *
   * The scope of the query can be constrained by providing a UUID to fetch only Sub-Collections of a specific collection.
   * Additional labels for the collection nodes can be specified to filter the results. Pagination parameters such as sort order,
   * limit, skip, and search string are also taken into account.
   *
   * @param {string[]} additionalLabels - The additional labels to match in the query, e.g., "Letter".
   * @param {string} sort - The field by which to sort the collections.
   * @param {string} order - The order in which to sort the collections (ascending or descending).
   * @param {number} limit - The maximum number of collections to return.
   * @param {number} skip - The number of collections to skip before starting to collect the result set.
   * @param {string} search - The search string to filter collections by their label.
   * @param {string | null} parentUuid - The UUID of the parent collection to restrict the scope to Sub-Collections, or null to fetch all.
   *
   * @return {Promise<PaginationResult<CollectionPreview[]>>} A promise that resolves to a paginated result of Collection preview objects.
   */
  public async getCollections(
    additionalLabels: string[],
    sort: string,
    order: string,
    limit: number,
    skip: number,
    search: string,
    parentUuid: string | null,
  ): Promise<PaginationResult<CollectionPreview[]>> {
    // Defines the scope: If parent uuid is provided, fetch only subcollections of it. Else, fetch everything
    const baseCollectionSnippet = parentUuid
      ? `MATCH (parent:Collection {uuid: '${parentUuid}'})<-[:PART_OF]-(c:Collection)`
      : `MATCH (c:Collection)`;

    const baseQuery: string =
      baseCollectionSnippet +
      `
      WHERE
          CASE
              WHEN size($additionalLabels) = 0 THEN size([l in labels(c) WHERE l <> 'Collection']) = 0
              ELSE apoc.coll.intersection($additionalLabels, labels(c))
          END
          AND
          toLower(c.label) CONTAINS $search
      `;

    const countQuery: string = baseQuery + `RETURN count(c) AS totalRecords`;

    const dataQuery: string =
      baseQuery +
      `
      // TODO: Fix sorting. Can be numbers, too (text count, annotation count etc.)
      WITH c,
          size([(c)<-[:PART_OF]-(sub:Collection) | sub]) as collectionCount,
          size([(c)<-[:PART_OF]-(sub:Text) | sub]) as textCount,
          size([(c)-[:HAS_ANNOTATION]-(a:Annotation) | a]) as annotationCount

      ORDER BY ${collectionSortField(sort)} ${order}
      SKIP ${skip}
      LIMIT ${limit}

      RETURN collect({
          collection: {
              nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
              data: c {.*}
          }, 
          nodeCounts: {
              collections: collectionCount,
              texts: textCount,
              annotations: annotationCount
          }
      }) AS collections
      `;

    const [countResult, dataResult] = await Promise.all([
      Neo4jDriver.runQuery(countQuery, { additionalLabels, search }),
      Neo4jDriver.runQuery(dataQuery, {
        additionalLabels,
        skip: int(skip),
        limit: int(limit),
        sort: int(sort),
        order,
        search,
      }),
    ]);

    const totalRecords: number = countResult.records[0]?.get('totalRecords') || 0;
    const rawData: CollectionPreview[] = dataResult.records[0]?.get('collections') || [];

    const data: CollectionPreview[] = rawData.map(cao => toNativeTypes(cao)) as CollectionPreview[];

    return {
      data,
      pagination: {
        limit,
        order,
        search,
        skip,
        sort,
        totalRecords,
      },
    };
  }

  /**
   * Retrieves data of a specified collection node.
   *
   * @param {string} uuid - The UUID of the collection node to retrieve.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<Collection>} A promise that resolves to the retrieved collection.
   */
  public async getCollection(uuid: string): Promise<Collection> {
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})

    RETURN {
        nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
        data: c {.*}
    } AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const rawCollection: Collection = result.records[0]?.get('collection');

    if (!rawCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    const collection: Collection = toNativeTypes(rawCollection) as Collection;

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
    // TODO: maxLevel 50 should be enough, but change maybe?
    // TODO: What if circular matches happen? uniqueness should filter that
    const query: string = `
    MATCH (c:Collection|Annotation|Text {uuid: $uuid})

    CALL apoc.path.expandConfig(c, {
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

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const ancestryPaths: NodeAncestry[] = result.records[0]?.get('paths');

    // TODO: Nested array, therefore this...fix within toNativeTypes function?
    return ancestryPaths.map(p => p.map(node => toNativeTypes(node))) as NodeAncestry[];
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

    // Match optional Text node chain
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

    RETURN {
        collection: {
            nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
            data: c {.*}
        }, 
        texts: [
            t IN texts | {
                nodeLabels: [l IN labels(t) WHERE l <> 'Text' | l],
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
   * Creates a new collection node with the given data and attaches it to a parent collection (optionally).
   *
   * While node labels and data of the collection node are mandatory, "texts" will always be an empty array
   * (not possibility to create on collection creation process) and "annotations" can be empty as well as with items.
   *
   * @param {CollectionCreationData} data - The data to set for the collection node.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<Collection>} A promise that resolves to the created collection node.
   */
  public async createNewCollection(data: CollectionCreationData): Promise<Collection> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    const fields: PropertyConfig[] = guidelineService.getCollectionConfigFieldsFromGuidelines(
      guidelines,
      data.collection.nodeLabels,
    );

    const collection: Collection = {
      nodeLabels: [...data.collection.nodeLabels, 'Collection'],
      data: {
        ...toNeo4jTypes(data.collection.data, fields),
        uuid: crypto.randomUUID(),
      },
    } as Collection;

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
        nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
        data: c {.*}
    } AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { collection, parentUuid });

    return result.records[0]?.get('collection');
  }

  public processCollectionTextsBeforeSaving(data: CollectionPostData): CollectionTextObject {
    const newData: CollectionAccessObject = data.data;
    const initialData: CollectionAccessObject = data.initialData;

    const initialTextUuids: string[] = initialData.texts.map(t => t.data.uuid);
    const newTextUUids: string[] = newData.texts.map(t => t.data.uuid);

    const createdTexts: Text[] = newData.texts.filter(
      text => !initialTextUuids.includes(text.data.uuid),
    );

    const deletedTexts: Text[] = initialData.texts.filter(
      text => !newTextUUids.includes(text.data.uuid),
    );

    const collectionTextObject: CollectionTextObject = {
      all: newData.texts,
      created: createdTexts,
      deleted: deletedTexts,
    };

    return collectionTextObject;
  }

  /**
   * Updates the properties of a Collection node with given UUID as well as its Text node network
   * (creating new nodes, deleting old nodes, changing order of existing nodes).
   *
   * @param {string} uuid - The UUID of the collection node to update.
   * @param {CollectionPostData} data - The data containing updates for the collection.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<ICollection>} A promise that resolves to the updated collection node.
   */
  public async updateCollection(uuid: string, data: CollectionPostData): Promise<ICollection> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const fields: PropertyConfig[] = await guidelineService.getCollectionConfigFields(
      data.data.collection.nodeLabels,
    );

    const texts: CollectionTextObject = this.processCollectionTextsBeforeSaving(data);
    const collection: Collection = {
      nodeLabels: data.data.collection.nodeLabels,
      data: toNeo4jTypes(data.data.collection.data, fields) as ICollection,
    };

    const query: string = `
    MATCH (c:Collection {uuid: $uuid})
    
    SET c = $collection.data

    WITH c, [l IN labels(c) WHERE l <> 'Collection'] AS labelsToRemove

    CALL apoc.create.removeLabels(c, labelsToRemove) YIELD node AS nodeBefore
    CALL apoc.create.addLabels(c, $collection.nodeLabels) YIELD node AS nodeAfter

    WITH c

    // Delete Text nodes
    CALL {
      UNWIND $texts.deleted as textToDelete
      MATCH (t:Text {uuid: textToDelete.data.uuid})
      
      // Match subgraph (annotations and characters - leave the rest alone for now)
      OPTIONAL MATCH (t)-[:HAS_ANNOTATION]->(a:Annotation)
      OPTIONAL MATCH (t)-[:NEXT_CHARACTER*]->(ch:Character)

      DETACH DELETE t, a, ch
    }

    // Create Text nodes
    CALL {
      WITH c

      UNWIND $texts.created as textToCreate
      MERGE (t:Text {uuid: textToCreate.data.uuid})-[:PART_OF]->(c)
      WITH t, textToCreate
      SET t = textToCreate.data

      RETURN collect(t) as createdTexts
    }

    // Set new labels to ALL text nodes
    CALL {
      WITH c

      UNWIND $texts.all as text
      MATCH (c)<-[:PART_OF]-(t:Text {uuid: text.data.uuid})
      WITH t, text, [l IN labels(t) WHERE l <> 'Text'] AS labelsToRemove
      CALL apoc.create.removeLabels(t, labelsToRemove) YIELD node AS nodeBefore
      CALL apoc.create.addLabels(t, text.nodeLabels) YIELD node AS nodeAfter

      RETURN collect(t) as relabeledTexts
    }
    
    // Remove NEXT relationships from all texts
    CALL {
      WITH c
      MATCH (c)<-[:PART_OF]-(t:Text)-[r:NEXT]->(t2:Text)
      DETACH DELETE r
    }

    // Create new chain of NEXT relationships between nodes
    CALL {
        WITH c

        UNWIND range(0, size($texts.all) - 2) AS idx
        
        MATCH (t1:Text {uuid: $texts.all[idx].data.uuid})
        MATCH (t2:Text {uuid: $texts.all[idx + 1].data.uuid})
        MERGE (t1)-[:NEXT]->(t2)
        
        RETURN collect(t1) as updatedTexts
    }

    RETURN c {.*} AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid, collection, texts });
    const updatedCollection: ICollection = result.records[0]?.get('collection');

    if (!updatedCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return updatedCollection;
  }

  /**
   * Deletes a collection node with given UUID, along with an associated text node.
   *
   * @param {string} uuid - The UUID of the collection node to delete.
   * @return {Promise<ICollection>} A promise that resolves to the deleted collection.
   */
  public async deleteCollection(uuid: string): Promise<ICollection> {
    // TODO: Update query so that it matches the whole subgraph
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})<-[:PART_OF]-(t:Text)
    OPTIONAL MATCH (t)-[:NEXT_CHARACTER*]->(chars:Character)
    WITH c, t, chars, c {.*} as collection
    DETACH DELETE c, t, chars
    RETURN collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const deletedCollection: ICollection = result.records[0]?.get('collection');

    if (!deletedCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return deletedCollection;
  }
}
