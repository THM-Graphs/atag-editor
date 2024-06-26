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
  public async getCharacters(collectionUuid: string): Promise<ICharacter[]> {
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

  /**
   * Updates the character chain that belongs to a collection's text node by splitting up the chain at the given start and end Character node.
   *
   * @param {string} collectionUuid - The UUID of the collection to update characters for.
   * @param {string | null} uuidStart - The UUID of the starting character, or null if no starting character.
   * @param {string | null} uuidEnd - The UUID of the ending character, or null if no ending character.
   * @param {ICharacter[]} characters - The array of characters to update.
   * @return {Promise<ICharacter[]>} A promise that resolves to an array of the whole updated character chain.
   */
  public async saveCharacters(
    collectionUuid: string,
    uuidStart: string | null,
    uuidEnd: string | null,
    characters: ICharacter[],
  ): Promise<ICharacter[]> {
    const query: string = `
    MATCH (c:Collection {uuid: $collectionUuid})-[:HAS_TEXT]->(t:Text)
    WITH t.uuid as uuidText
    CALL atag.chains.update(uuidText, $uuidStart, $uuidEnd, $characters, {
      textLabel: "Text",
      elementLabel: "Character",
      relationshipType: "NEXT_CHARACTER"
    }) YIELD path
    UNWIND nodes(path) as n
    RETURN COLLECT(n {.*}) as characters
    `;

    // console.log('query:');
    // console.log(collectionUuid, uuidStart, uuidEnd, characters.map(c => c.text).join('').length);

    let updatedCharacters: ICharacter[] = [];

    try {
      const result: QueryResult = await Neo4jDriver.runQuery(query, {
        collectionUuid,
        uuidStart,
        uuidEnd,
        characters,
      });

      updatedCharacters = result.records[0]?.get('characters');

      // console.log('result:');
      // console.log(createdCharacters.map(c => c.text).join(''));
    } catch (error: unknown) {
      console.log(error);
    }

    return updatedCharacters;
  }
}
