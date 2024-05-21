import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import ICollection from '../models/ICollection.js';
import { CollectionPostData } from '../models/types.js';

export default class CollectionService {
  /**
   * Retrieves collection nodes based on the additional label provided.
   *
   * @param {string} additionalLabel - The additional label to match in the query, for example "METADATA" for collection nodes containing text metadata.
   * @return {Promise<ICollection[]>} A promise that resolves to an array of collections.
   */
  public async getCollections(additionalLabel: string): Promise<ICollection[]> {
    const query: string = `
    MATCH (n:COLLECTION:${additionalLabel}) RETURN COLLECT(n {.*}) as collections
    `;

    let collections: ICollection[] = [];

    try {
      const result: QueryResult = await Neo4jDriver.runQuery(query);
      collections = result.records[0]?.get('collections');
    } catch (error: unknown) {
      console.log(error);
    }

    return collections;
  }

  /**
   * Retrieves data of a specified collection node.
   *
   * @param {string} uuid - The UUID of the collection node to retrieve.
   * @return {Promise<ICollection | undefined>} A promise that resolves to the retrieved collection or undefined if not found.
   */
  public async getCollectionById(uuid: string): Promise<ICollection | undefined> {
    const query: string = `
    MATCH (c:COLLECTION {uuid: $uuid})
    RETURN c {.*} AS collection
    `;

    let collection: ICollection | undefined = undefined;

    try {
      const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
      collection = result.records[0]?.get('collection');
    } catch (error: unknown) {
      console.log(error);
    }

    return collection;
  }

  /**
   * Creates a new collection node with given data as properties, along with an associated text node.
   *
   * @param {CollectionPostData} data - The data containing the UUID and label for the new collection node.
   * @return {Promise<ICollection | undefined>} A promise that resolves to the newly created collection or undefined.
   */
  public async createNewCollection(data: CollectionPostData): Promise<ICollection | undefined> {
    const { uuid, label } = data;
    const textUuid: string = crypto.randomUUID();

    const query: string = `
    CREATE (c:Collection {uuid: $uuid, label: $label})-[:HAS_TEXT]->(t:Text {uuid: $textUuid})
    RETURN c {.*} AS collection
    `;

    let collection: ICollection | undefined = undefined;

    try {
      const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid, label, textUuid });
      collection = result.records[0]?.get('collection');
    } catch (error: unknown) {
      console.log(error);
    }

    return collection;
  }

  /**
   * Updates the label property of a collection node with given UUID.
   *
   * @param {string} uuid - The UUID of the collection node to update.
   * @param {string} label - The new label for the collection node.
   * @return {Promise<ICollection | undefined>} A promise that resolves to the updated collection node or undefined if not found.
   */
  public async updateCollection(uuid: string, label: string): Promise<ICollection | undefined> {
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})
    SET c.label = $label
    RETURN c {.*} AS collection
    `;

    let updatedCollection: ICollection | undefined = undefined;

    try {
      const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid, label });
      updatedCollection = result.records[0]?.get('collection');
    } catch (error) {
      console.error(error);
    }

    return updatedCollection;
  }
}
