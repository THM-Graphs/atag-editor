import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import IAnnotation from '../models/IAnnotation.js';

export default class AnnotationService {
  public async getAnnotations(collectionUuid: string): Promise<IAnnotation[]> {
    const query: string = `
    MATCH (c:Collection {uuid: $collectionUuid})-[:HAS_TEXT]->(t:Text)-[:HAS_ANNOTATION]->(a:Annotation)
    RETURN COLLECT(a {.*}) as annotations
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { collectionUuid });

    return result.records[0]?.get('annotations');
  }
}
