import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import ICharacter from '../models/ICharacter.js';
import { Character } from '../models/types.js';

export default class CharacterService {
  /**
   * Retrieves chain of characters that belong to a collection's text node.
   *
   * @param {string} collectionUuid - The UUID of the collection to retrieve characters for.
   * @return {Promise<Character[]>} A promise that resolves to an array of characters.
   */
  public async getCharacters(collectionUuid: string): Promise<Character[]> {
    const query: string = `
    MATCH (c:Collection {uuid: $collectionUuid})<-[:PART_OF]-(t:Text)-[:NEXT_CHARACTER*]->(char:Character)
    WITH char, [(char)-[:CHARACTER_HAS_ANNOTATION]->(a:Annotation) | 
      {
        uuid: a.uuid,
        type: a.type,
        subtype: a.subtype,
        isFirstCharacter: EXISTS((a)-[:STANDOFF_START]->(char)),
        isLastCharacter: EXISTS((a)-[:STANDOFF_END]->(char))
      }] AS annotations
    RETURN COLLECT({
      data: char {.*},
      annotations: annotations
    }) AS characters
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { collectionUuid });

    return result.records[0]?.get('characters');
  }

  /**
   * Updates the character chain that belongs to a collection's text node by splitting up the chain at the given start and end Character node.
   *
   * @param {string} collectionUuid - The UUID of the collection to update characters for.
   * @param {string | null} uuidStart - The UUID of the starting character, or null if no starting character.
   * @param {string | null} uuidEnd - The UUID of the ending character, or null if no ending character.
   * @param {ICharacter[]} characters - The array of characters that will form the new chain snippet between given start and end Character node.
   * @param {string} text - The concatenated characters that will be set on the text node's "text" property.
   * @return {Promise<ICharacter[]>} A promise that resolves to an array of the whole updated character chain.
   */
  public async saveCharacters(
    collectionUuid: string,
    uuidStart: string | null,
    uuidEnd: string | null,
    characters: ICharacter[],
    text: string,
  ): Promise<ICharacter[]> {
    const query: string = `
    MATCH (c:Collection {uuid: $collectionUuid})<-[:PART_OF]-(t:Text)
    SET t.text = $text
    WITH t
    CALL atag.chains.update(t.uuid, $uuidStart, $uuidEnd, $characters, {
      textLabel: "Text",
      elementLabel: "Character",
      relationshipType: "NEXT_CHARACTER"
    }) YIELD path
    UNWIND nodes(path) as n
    RETURN COLLECT(n {.*}) as characters
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      collectionUuid,
      uuidStart,
      uuidEnd,
      characters,
      text,
    });

    return result.records[0]?.get('characters');
  }
}
