import { int, QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import NotFoundError from '../errors/not-found.error.js';
import ICollection from '../models/ICollection.js';
import { IGuidelines } from '../models/IGuidelines.js';
import {
  CollectionAccessObject,
  PaginationResult,
  CollectionPostData,
  CollectionProperty,
  Text,
} from '../models/types.js';

type CollectionTextObject = {
  all: Text[];
  created: Text[];
  deleted: Text[];
};

export default class CollectionService {
  /**
   * Retrieves paginated collection nodes together with connected text nodes. Additional node labels for the collection node
   * as well as pagination parameters are provided.
   *
   * @param {string} additionalLabel - The additional label to match in the query, e.g., "Letter".
   * @param {string} sort - The field by which to sort the collections.
   * @param {string} order - The order in which to sort the collections (ascending or descending).
   * @param {number} limit - The maximum number of collections to return.
   * @param {number} skip - The number of collections to skip before starting to collect the result set.
   * @param {string} search - The search string to filter collections by their label.
   * @return {Promise<PaginationResult<CollectionAccessObject[]>>} A promise that resolves to a paginated result of collection access objects.
   */
  public async getCollections(
    additionalLabel: string,
    sort: string,
    order: string,
    limit: number,
    skip: number,
    search: string,
  ): Promise<PaginationResult<CollectionAccessObject[]>> {
    const countQuery: string = `
    MATCH (c:Collection:${additionalLabel})
    WHERE c.label CONTAINS $search
    RETURN count(c) AS totalRecords
    `;

    const dataQuery: string = `
    MATCH (c:Collection:${additionalLabel})
    WHERE toLower(c.label) CONTAINS $search

    WITH c
    ORDER BY c.${sort} ${order}
    SKIP ${skip}
    LIMIT ${limit}

    // Match optional Text node chain
    OPTIONAL MATCH (c)<-[:PART_OF]-(tStart:Text)
    WHERE NOT ()-[:NEXT]->(tStart)
    OPTIONAL MATCH (tStart)-[:NEXT*]->(t:Text)

    WITH c, tStart, collect(t) AS nextTexts
    WITH c, coalesce(tStart, []) + nextTexts AS texts

    RETURN collect({
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
    }) AS collections
    `;

    const [countResult, dataResult] = await Promise.all([
      Neo4jDriver.runQuery(countQuery, { search }),
      Neo4jDriver.runQuery(dataQuery, {
        skip: int(skip),
        limit: int(limit),
        sort: int(sort),
        order,
        search,
      }),
    ]);

    const totalRecords: number = countResult.records[0]?.get('totalRecords') || 0;
    const data: CollectionAccessObject[] = dataResult.records[0]?.get('collections') || [];

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
   * @return {Promise<ICollection>} A promise that resolves to the retrieved collection.
   */
  public async getCollectionById(uuid: string): Promise<ICollection> {
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})
    RETURN c {.*} AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const collection: ICollection = result.records[0]?.get('collection');

    if (!collection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return collection;
  }

  /**
   * Retrieves collection node with given UUID together with connected text nodes.
  
   * @param {string} uuid - The UUID of the collection node to retrieve.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<CollectionAccessObject>} A promise that resolves to the retrieved collection and text nodes.
   */
  public async getExtendedCollectionById(uuid: string): Promise<CollectionAccessObject> {
    // TODO: This query is not working with more than one additional node label. Considerate
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})

    // Match optional Text node chain
    OPTIONAL MATCH (c)<-[:PART_OF]-(tStart:Text)
    WHERE NOT ()-[:NEXT]->(tStart)
    OPTIONAL MATCH (tStart)-[:NEXT*]->(t:Text)

    WITH c, tStart, collect(t) AS nextTexts
    WITH c, coalesce(tStart, []) + nextTexts AS texts    

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
    const collection: CollectionAccessObject = result.records[0]?.get('collection');

    if (!collection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return collection;
  }

  /**
   * Creates a new collection node with the given properties and labels.
   *
   * Adds default values for required properties if they are not provided.
   *
   * @param {ICollection} data - The data to set for the collection node.
   * @param {string[]} nodeLabels - The additional labels to add to the collection node.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<ICollection>} A promise that resolves to the created collection node.
   */
  public async createNewCollection(data: ICollection, nodeLabels: string[]): Promise<ICollection> {
    const guidelineService: GuidelinesService = new GuidelinesService();

    const requiredFields: CollectionProperty[] =
      await guidelineService.getCollectionConfigFields(nodeLabels);

    // Add default properties if they are not sent in the request
    requiredFields.forEach(property => {
      if (!(property.name in data)) {
        data[property.name] = '';
      }
    });

    data = { ...data, uuid: crypto.randomUUID() };

    nodeLabels.push('Collection');

    const query: string = `
    CALL apoc.create.node($nodeLabels, $data) YIELD node as c
    RETURN c {.*} AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { data, nodeLabels });

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
    const { collection } = data.data;
    const texts: CollectionTextObject = this.processCollectionTextsBeforeSaving(data);

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
      
      // Match subgraph
      CALL apoc.path.subgraphNodes(t, {
          relationshipFilter: 'HAS_ANNOTATION>,REFERS_TO>,<PART_OF',
          labelFilter: 'Collection|Text|Annotation'
      }) YIELD node

      WITH t, node

      OPTIONAL MATCH (node)-[:NEXT_CHARACTER*]->(ch:Character)

      DETACH DELETE t, node, ch
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
      MATCH (c)<-[:PART_OF]->(t:Text)-[r:NEXT]->(t2:Text)
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
