import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import NotFoundError from '../errors/not-found.error.js';
import ICollection from '../models/ICollection.js';
import { IGuidelines } from '../models/IGuidelines.js';
import { CollectionAccessObject, CollectionPostData, Text } from '../models/types.js';

type CollectionTextObject = {
  all: Text[];
  created: Text[];
  deleted: Text[];
};

export default class CollectionService {
  /**
   * Retrieves collection nodes based on the additional label provided.
   *
   * @param {string} additionalLabel - The additional label to match in the query, for example "Letter" for collection nodes containing text metadata.
   * @return {Promise<ICollection[]>} A promise that resolves to an array of collections.
   */
  public async getCollections(additionalLabel: string): Promise<ICollection[]> {
    const query: string = `
    MATCH (n:Collection:${additionalLabel}) RETURN collect(n {.*}) as collections
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query);

    return result.records[0]?.get('collections');
  }

  /**
   * Retrieves collection nodes together with connected text nodes based on the additional label provided.
   *
   * @param {string} additionalLabel - The additional label to match in the query, for example "Letter" for collection nodes containing text metadata.
   * @return {Promise<CollectionAccessObject[]>} A promise that resolves to an array of collection access objects.
   */
  public async getCollectionsWithTexts(additionalLabel: string): Promise<CollectionAccessObject[]> {
    const query: string = `
    MATCH (c:Collection:${additionalLabel})

    // Match optional Text node chain
    OPTIONAL MATCH (c)<-[:PART_OF]-(tStart:Text)
    WHERE NOT ()-[:NEXT]->(tStart)
    OPTIONAL MATCH (tStart)-[:NEXT*]->(t:Text)

    WITH c, tStart, collect(t) AS nextTexts
    WITH c, coalesce(tStart, []) + nextTexts AS texts

    RETURN collect({
        collection: {
            nodeLabel: [l in labels(c) WHERE l <> 'Collection' | l][0] ,
            data: c {.*}
        }, 
        texts: [
            t IN texts | {
                nodeLabel: [l IN labels(t) WHERE l <> 'Text' | l][0],
                data: t {.*}
            }
        ]
    }) AS collections
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query);

    return result.records[0]?.get('collections');
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
            nodeLabel: [l in labels(c) WHERE l <> 'Collection' | l][0],
            data: c {.*}
        }, 
        texts: [
            t IN texts | {
                nodeLabel: [l IN labels(t) WHERE l <> 'Text' | l][0],
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
   * Creates a new collection node with given data as properties.
   *
   * @param {Record<string, string>} data - JSON data for the new collection node.
   * @return {Promise<ICollection>} A promise that resolves to the newly created collection.
   */
  // TODO: Make additional label(s) dynamic
  public async createNewCollection(
    data: Record<string, string>,
    additionalLabel: string,
  ): Promise<ICollection> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    // Add default properties if they are not sent in the request
    guidelines.collections['text'].properties.forEach(property => {
      if (!data[property.name]) {
        data[property.name] = '';
      }
    });

    data = { ...data, uuid: crypto.randomUUID() };

    const query: string = `
    CREATE (c:Collection:${additionalLabel} $data)
    RETURN c {.*} AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { data });

    return result.records[0]?.get('collection');
  }

  // TODO: Delete, since this will not be needed
  // /**
  //  * Updates the properties of a collection node with given UUID.
  //  *
  //  * @param {string} uuid - The UUID of the collection node to update.
  //  * @param {Record<string, string>} data - The data for the collection node.
  //  * @throws {NotFoundError} If the collection with the specified UUID is not found.
  //  * @return {Promise<ICollection>} A promise that resolves to the updated collection node.
  //  */
  // public async updateCollection(uuid: string, data: Record<string, string>): Promise<ICollection> {
  //   const query: string = `
  //   MATCH (c:Collection {uuid: $uuid})
  //   SET c = $data
  //   RETURN c {.*} AS collection
  //   `;

  //   const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid, data });
  //   const updatedCollection: ICollection = result.records[0]?.get('collection');

  //   if (!updatedCollection) {
  //     throw new NotFoundError(`Collection with UUID ${uuid} not found`);
  //   }

  //   return updatedCollection;
  // }

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

  // TODO: Rewrite JSDoc
  /**
   * Updates the properties of a collection node with given UUID.
   *
   * @param {string} uuid - The UUID of the collection node to update.
   * @param {Record<string, string>} data - The data for the collection node.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<ICollection>} A promise that resolves to the updated collection node.
   */
  public async updateCollection(uuid: string, data: CollectionPostData): Promise<ICollection> {
    const { collection } = data.data;
    const texts: CollectionTextObject = this.processCollectionTextsBeforeSaving(data);

    const query: string = `
    MATCH (c:Collection {uuid: $uuid})
    
    SET c = $collection.data

    WITH c

    // Delete Text nodes
    CALL {
      UNWIND $texts.deleted as textToDelete
      MATCH (t:Text {uuid: textToDelete.data.uuid})
      // TODO: Delete whole subgraph
      DETACH DELETE t
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
      CALL apoc.create.addLabels(t, [text.nodeLabel]) YIELD node AS nodeAfter

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
