import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import NotFoundError from '../errors/not-found.error.js';
import ICollection from '../models/ICollection.js';
import { IGuidelines } from '../models/IGuidelines.js';

export default class CollectionService {
  /**
   * Retrieves collection nodes based on the additional label provided.
   *
   * @param {string} additionalLabel - The additional label to match in the query, for example "Letter" for collection nodes containing text metadata.
   * @return {Promise<ICollection[]>} A promise that resolves to an array of collections.
   */
  public async getCollections(additionalLabel: string): Promise<ICollection[]> {
    const query: string = `
    MATCH (n:Collection:${additionalLabel}) RETURN COLLECT(n {.*}) as collections
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
   * Creates a new collection node with given data as properties, along with an associated text node.
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

    const result: QueryResult = await Neo4jDriver.runQuery(query, { data, textUuid });

    return result.records[0]?.get('collection');
  }

  /**
   * Updates the properties of a collection node with given UUID.
   *
   * @param {string} uuid - The UUID of the collection node to update.
   * @param {Record<string, string>} data - The data for the collection node.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<ICollection>} A promise that resolves to the updated collection node.
   */
  public async updateCollection(uuid: string, data: Record<string, string>): Promise<ICollection> {
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})
    SET c = $data
    RETURN c {.*} AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid, data });
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
    // TODO: Delete Character nodes, too
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})-[:HAS_TEXT]->(t:Text)
    WITH c, t, c {.*} as collection
    DETACH DELETE c, t
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
