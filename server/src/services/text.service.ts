import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import NotFoundError from '../errors/not-found.error.js';
import ICollection from '../models/ICollection.js';
import { IGuidelines } from '../models/IGuidelines.js';
import { Collection } from '../models/types.js';
import IText from '../models/IText.js';
import { TextAccessObject } from '../models/types.js';

export default class TextService {
  /**
   * Retrieves text nodes based on the additional label provided.
   *
   * @param {string} additionalLabel - The additional label to match in the query, for example "MainText" for text nodes that are
   * the entry point for a letter text.
   * @return {Promise<IText[]>} A promise that resolves to an array of texts.
   */
  public async getTexts(additionalLabel?: string): Promise<IText[]> {
    const query: string = `
    MATCH (t:Text${additionalLabel ? `:${additionalLabel}` : ''})
    RETURN COLLECT(t {.*}) as texts
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query);

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
    // TODO: This query is not working with more than one additional node label. Considerate
    // TODO: "Letter" label should be made dynamic
    const query: string = `
    MATCH (t:Text {uuid: $uuid})
    WITH t
    MATCH (t)-[:PART_OF]->(c:Collection)
    MATCH p = (t)-[:HAS_TEXT | REFERS_TO | HAS_ANNOTATION | PART_OF*]-(:Collection:Letter)

    RETURN {
        text: {
            nodeLabels: [l IN labels(t) WHERE l <> 'Text' | l],
            data: t {.*}
        },
        collection: {
            nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
            data: c {.*}
        },
        path: [n IN reverse(nodes(p)) | {nodeLabels: labels(n), data: n {.*}}]
    } as text
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const text: TextAccessObject = result.records[0]?.get('text');

    if (!text) {
      throw new NotFoundError(`Text with UUID ${uuid} not found`);
    }

    return text;
  }
}
