import { int, QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import { sortDirection } from '../utils/cypher.js';
import { ancestryPaths } from '../utils/cypher.js';
import { createCharactersFromText, toNativeTypes, toNeo4jTypes } from '../utils/helper.js';
import NotFoundError from '../errors/notFound.error.js';
import ICollection from '../models/ICollection.js';
import { IGuidelines } from '../models/IGuidelines.js';
import {
  CollectionAccessObject,
  PaginationResult,
  CollectionPostData,
  PropertyConfig,
  Text,
  Collection,
  NodeAncestry,
  CollectionCreationData,
  CursorData,
} from '../models/types.js';
import ICharacter from '../models/ICharacter.js';

type CollectionTextObject = {
  all: Text[];
  created: CreatedText[];
  deleted: Text[];
};

type CreatedText = Text & {
  characters: ICharacter[];
};

export default class CollectionService {
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
   * @return {Promise<PaginationResult<Collection[]>>} A promise that resolves to a paginated result of Collections.
   */
  public async getCollections(
    additionalLabels: string[],
    order: string,
    limit: number,
    search: string,
    parentUuid: string | null,
    cursor: CursorData | null = null,
  ): Promise<PaginationResult<Collection[]>> {
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
          nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
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
    const rawData: Collection[] = dataResult.records[0]?.get('collections') || [];

    // Check if there are more records
    const hasMore: boolean = rawData.length > limit;
    const collections: Collection[] = hasMore ? rawData.slice(0, limit) : rawData;

    const data: Collection[] = collections.map(c => toNativeTypes(c)) as Collection[];

    // Generate next cursor from the last item
    let nextCursor: CursorData | null = null;

    if (hasMore && data.length > 0) {
      const lastItem: Collection = data[data.length - 1];

      nextCursor = {
        label: lastItem.data.label,
        uuid: lastItem.data.uuid,
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
      data: toNeo4jTypes(data.collection.data, fields),
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

    const createdTexts: CreatedText[] = newData.texts
      .filter((text: Text) => !initialTextUuids.includes(text.data.uuid))
      .map((t: Text) => ({
        ...t,
        characters: createCharactersFromText(t.data.text),
      }));

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
   * @return {Promise<Collection>} A promise that resolves to the updated collection node.
   */
  public async updateCollection(uuid: string, data: CollectionPostData): Promise<Collection> {
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

      WITH t, textToCreate

      CALL atag.chains.update(t.uuid, null, null, textToCreate.characters, {
          textLabel: "Text",
          elementLabel: "Character",
          relationshipType: "NEXT_CHARACTER"
      }) YIELD path

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

    RETURN {
        nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
        data: c {.*}
    } AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid, collection, texts });
    const updatedCollection: Collection = result.records[0]?.get('collection');

    if (!updatedCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return updatedCollection;
  }

  /**
   * Deletes a Collection node with the given UUID, along with its associated Text nodes, Character nodes, and Annotation nodes.
   *
   * @param {string} uuid - The UUID of the Collection node to delete.
   * @throws {NotFoundError} If the Collection with the specified UUID is not found.
   * @return {Promise<Collection>} A promise that resolves to the deleted Collection node.
   */
  public async deleteCollection(uuid: string): Promise<Collection> {
    const query: string = `

    MATCH (c:Collection {uuid: $uuid})

    WITH c, {
        nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
        data: c {.*}
    } AS collectionToDelete

    // Delete annotations
    CALL (c) {
        OPTIONAL MATCH (c)-[:HAS_ANNOTATION]->(a:Annotation)
        DETACH DELETE a
    }

    // Delete texts, characters, and annotations
    CALL (c) {
        OPTIONAL MATCH (c)<-[:PART_OF]-(t:Text)
        
        OPTIONAL MATCH (t)-[:HAS_ANNOTATION]->(a:Annotation)
        OPTIONAL MATCH (t)-[:NEXT_CHARACTER*]->(ch:Character)

        DETACH DELETE t, a, ch
    }

    // Delete collection
    DETACH DELETE c

    RETURN collectionToDelete as collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const deletedCollection: Collection = result.records[0]?.get('collection');

    if (!deletedCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return deletedCollection;
  }
}
