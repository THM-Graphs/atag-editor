import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import IAnnotation from '../models/IAnnotation.js';
import { Annotation } from '../models/types.js';

export default class AnnotationService {
  public async getAnnotations(collectionUuid: string): Promise<IAnnotation[]> {
    const query: string = `
    MATCH (c:Collection {uuid: $collectionUuid})-[:HAS_TEXT]->(t:Text)-[:HAS_ANNOTATION]->(a:Annotation)
    RETURN COLLECT(a {.*}) as annotations
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { collectionUuid });

    return result.records[0]?.get('annotations');
  }

  public async saveAnnotations(
    collectionUuid: string,
    annotations: Annotation[],
  ): Promise<IAnnotation[]> {
    // TODO: Improve query speed, way too many db hits
    const query: string = `
    WITH $annotations as allAnnotations

    // 1. Delete deleted annotations
    CALL {
        UNWIND $annotations AS delAnnotation
        WITH delAnnotation
        WHERE delAnnotation.status = 'deleted'
        MATCH (a:Annotation {uuid: delAnnotation.data.uuid})
        DETACH DELETE a
    }

    WITH allAnnotations

    MATCH (c:Collection {uuid: $collectionUuid})-[:HAS_TEXT]->(t:Text)
    MATCH (t)-[:NEXT_CHARACTER*]->(ch:Character)

    // 2. Handle other annotations (merge)
    UNWIND allAnnotations AS ann
    WITH ann, t, ch
    WHERE ann.status <> 'deleted'

    // Create (new) annotation node
    MERGE (a:Annotation {uuid: ann.data.uuid})

    // Set data
    SET a = ann.data

    // Create edge to text node
    MERGE (t)-[:HAS_ANNOTATION]->(a)

    WITH t, a, ann, ch
    WHERE ch.uuid IN ann.characterUuids OR ch.uuid = ann.startUuid OR ch.uuid = ann.endUuid

    // Create edges
    MERGE (ch)-[:CHARACTER_HAS_ANNOTATION]->(a)
    FOREACH (_ IN CASE WHEN ch.uuid = ann.startUuid THEN [1] ELSE [] END |
        MERGE (a)-[:STANDOFF_START]->(ch))
    FOREACH (_ IN CASE WHEN ch.uuid = ann.endUuid THEN [1] ELSE [] END |
        MERGE (a)-[:STANDOFF_END]->(ch))
        
    RETURN collect(distinct a {.*}) AS annotations
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { collectionUuid, annotations });

    return result.records[0]?.get('annotations');
  }
}
