import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import IEntity from '../models/IEntity.js';

export default class EntityService {
  /**
   * Retrieves entities of a given node label that contain the search string in their `label` property.
   * Entity nodes are nodes connected to `Annotation` nodes and part of the entities/metadata network
   *
   * @param {string} nodeLabel - The node label to search, e.g. "ActorRole" or "Entity"
   * @param {string} searchStr - The search string to search for.
   * @return {Promise<IEntity[]>} A promise that resolves to an array of entities with the given label.
   */
  async searchByLabel(nodeLabel: string, searchStr: string): Promise<IEntity[]> {
    const query: string = `
		MATCH (n:${nodeLabel})
    WHERE toLower(n.label) CONTAINS toLower($searchStr)
    WITH n ORDER BY n.label ASC
		RETURN collect(n {.*}) as entities
		`;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { nodeLabel, searchStr });

    return result.records[0]?.get('entities');
  }
}
