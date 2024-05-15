import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import ICharacter from '../models/ICharacter.js';

export default class CharacterService {
  /**
   * Retrieves chain of characters that belong to a collection's text node.
   *
   * @param {string} collectionUuid - The UUID of the collection to retrieve characters for.
   * @return {Promise<ICharacter[]>} A promise that resolves to an array of characters.
   */
  async getCharacters(collectionUuid: string): Promise<ICharacter[]> {
    const query: string = `
    MATCH (c:Collection {uuid: $collectionUuid})-[:HAS_TEXT]->(t:Text)-[:NEXT_CHARACTER*]->(char:Character)
    RETURN COLLECT(char {.*}) as characters
    `;

    let characters: ICharacter[] = [];

    try {
      const result: QueryResult = await Neo4jDriver.runQuery(query, { collectionUuid });
      characters = result.records[0]?.get('characters');
    } catch (error: unknown) {
      console.log(error);
    }

    return characters;
  }
}
