import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import ICharacter from '../models/ICharacter.js';

export default class CharacterService {
  async getCharacters(collectionUuid: string): Promise<ICharacter[]> {
    // TODO: Implement cypher query
    const query: string = ``;

    let characters: ICharacter[] = [];

    // try {
    //   const result: QueryResult = await Neo4jDriver.runQuery(query, { collectionUuid });
    //   characters = result.records[0]?.get('characters');
    // } catch (error: unknown) {
    //   console.log(error);
    // }

    return characters;
  }
}
