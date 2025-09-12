import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import NotFoundError from '../errors/not-found.error.js';
import { Text, TextAccessObject } from '../models/types.js';
import { ancestryPaths } from '../utils/cypher.js';
import { toNativeTypes } from '../utils/helper.js';

export default class TextService {
  public async getTexts(collectionUuid: string): Promise<Text[]> {
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})

    CALL {
        WITH c
  
        OPTIONAL MATCH (c)<-[:PART_OF]-(tStart:Text)
        WHERE NOT ()-[:NEXT]->(tStart)
        OPTIONAL MATCH (tStart)-[:NEXT*]->(t:Text)

        WITH tStart, collect(t) AS nextTexts
        WITH coalesce(tStart, []) + nextTexts AS texts

        RETURN texts as texts
    }

    WITH c, texts

    RETURN [
            t IN texts | {
                nodeLabels: [l IN labels(t) WHERE l <> 'Text' | l],
                data: t {.*}
            }
    ] AS texts
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid: collectionUuid });

    return result.records[0]?.get('texts');
  }

  /**
   * Retrieves extended data of a specified text node (Text node, corresponding Collection node and path to top-level Collection node).
   *
   * @param {string} uuid - The UUID of the text node to retrieve.
   * @throws {NotFoundError} If the text with the specified UUID is not found.
   * @return {Promise<TextAccessObject>} A promise that resolves to the retrieved extended text.
   */
  public async getExtendedTextByUuid(uuid: string): Promise<TextAccessObject> {
    const query: string = `
    MATCH (t:Text {uuid: $uuid})
    MATCH (t)-[:PART_OF]->(c:Collection)
    
    CALL (t) {
        ${ancestryPaths('t')}
    }

    RETURN {
        text: {
            nodeLabels: [l IN labels(t) WHERE l <> 'Text' | l],
            data: t {.*}
        },
        collection: {
            nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
            data: c {.*}
        },
        path: paths[0]
    } as text
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const rawText: TextAccessObject = result.records[0]?.get('text');

    if (!rawText) {
      throw new NotFoundError(`Text with UUID ${uuid} not found`);
    }

    const text: TextAccessObject = toNativeTypes(rawText) as TextAccessObject;

    return text;
  }
}
