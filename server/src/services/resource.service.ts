import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import IActorRole from '../models/IActorRole.js';
import IConcept from '../models/IConcept.js';
import IEntity from '../models/IEntity.js';

export default class ResourceService {
  /**
   * Retrieves resources of a given node label that contain the search string in their `label` property.
   * Resource nodes are nodes connected to `Annotation` nodes and part of the metadata network
   *
   * @param {string} nodeLabel - The node label to search, e.g. "ActorRole" or "Entity"
   * @param {string} searchStr - The search string to search for.
   * @return {Promise<IEntity[] | IActorRole[] | IConcept[]>} A promise that resolves to an array of resources with the given label.
   */
  async searchByLabel(
    nodeLabel: string,
    searchStr: string,
  ): Promise<IEntity[] | IActorRole[] | IConcept[]> {
    const query: string = `
		MATCH (n:${nodeLabel})
    WHERE toLower(n.label) CONTAINS toLower($searchStr)
    WITH n ORDER BY n.label ASC
		RETURN collect(n {.*}) as resources
		`;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { nodeLabel, searchStr });

    return result.records[0]?.get('resources');
  }
}
