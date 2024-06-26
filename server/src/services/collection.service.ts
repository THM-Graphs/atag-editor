import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import ICollection from '../models/ICollection.js';
import { IGuidelines } from '../models/IGuidelines.js';

export default class CollectionService {
  /**
   * Retrieves collection nodes based on the additional label provided.
   *
   * @param {string} additionalLabel - The additional label to match in the query, for example "METADATA" for collection nodes containing text metadata.
   * @return {Promise<ICollection[]>} A promise that resolves to an array of collections.
   */
  public async getCollections(additionalLabel: string): Promise<ICollection[]> {
    const query: string = `
    MATCH (n:Collection:${additionalLabel}) RETURN COLLECT(n {.*}) as collections
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
    MATCH (c:Collection {uuid: $uuid})
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
   * @param {Record<string, string>} data - JSON data for the new collection node.
   * @return {Promise<ICollection | undefined>} A promise that resolves to the newly created collection or undefined.
   */
  // TODO: Make additional label(s) dynamic
  public async createNewCollection(
    data: Record<string, string>,
    additionalLabel: string,
  ): Promise<ICollection | undefined> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    const textUuid: string = crypto.randomUUID();

    // Add default properties if they are not sent in the request
    guidelines.collections['text'].properties.forEach(property => {
      if (!data[property.name]) {
        data[property.name] = '';
      }
    });

    data = { ...data, uuid: crypto.randomUUID() };

    const query: string = `
    CREATE (c:Collection:${additionalLabel} $data)-[:HAS_TEXT]->(t:Text {uuid: $textUuid})
    RETURN c {.*} AS collection
    `;

    let collection: ICollection | undefined = undefined;

    try {
      const result: QueryResult = await Neo4jDriver.runQuery(query, { data, textUuid });
      collection = result.records[0]?.get('collection');
    } catch (error: unknown) {
      console.log(error);
    }

    return collection;
  }

  /**
   * Updates the properties of a collection node with given UUID.
   *
   * @param {string} uuid - The UUID of the collection node to update.
   * @param {Record<string, string>} data - The data for the collection node.
   * @return {Promise<ICollection | undefined>} A promise that resolves to the updated collection node or undefined if not found.
   */
  public async updateCollection(
    uuid: string,
    data: Record<string, string>,
  ): Promise<ICollection | undefined> {
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})
    SET c = $data
    RETURN c {.*} AS collection
    `;

    let updatedCollection: ICollection | undefined = undefined;

    try {
      const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid, data });
      updatedCollection = result.records[0]?.get('collection');
    } catch (error) {
      console.error(error);
    }

    return updatedCollection;
  }

  /**
   * Deletes a collection node with given UUID, along with an associated text node.
   *
   * @param {string} uuid - The UUID of the collection node to delete.
   * @return {Promise<ICollection | undefined>} A promise that resolves to the deleted collection or undefined.
   */
  public async deleteCollection(uuid: string): Promise<ICollection | undefined> {
    // TODO: Delete Character nodes, too
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})-[:HAS_TEXT]->(t:Text)
    WITH c, t, c {.*} as collection
    DETACH DELETE c, t
    RETURN collection
    `;

    let deletedCollection: ICollection | undefined = undefined;

    try {
      const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
      deletedCollection = result.records[0]?.get('collection');
    } catch (error) {
      console.error(error);
    }

    return deletedCollection;
  }
}
