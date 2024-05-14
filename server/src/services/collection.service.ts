import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import ICollection from '../models/ICollection.js';

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
}
