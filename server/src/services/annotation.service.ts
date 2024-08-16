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

    // 2. Handle other annotations (merge)
    UNWIND allAnnotations AS ann
    WITH ann, t
    WHERE ann.status <> 'deleted'

    // Create (new) annotation node
    MERGE (a:Annotation {uuid: ann.data.uuid})

    // Set data
    SET a = ann.data

    // Create edge to text node
    MERGE (t)-[:HAS_ANNOTATION]->(a)

    // Handle character relationships
    WITH a, ann
    UNWIND ann.characterUuids AS uuid
    MATCH (c:Character {uuid: uuid})
    MERGE (c)-[:CHARACTER_HAS_ANNOTATION]->(a)

    // Handle standoff relationships
    WITH a, ann
    MATCH (sc:Character {uuid: ann.startUuid})
    MERGE (a)-[:STANDOFF_START]->(sc)

    WITH a, ann
    MATCH (ec:Character {uuid: ann.endUuid})
    MERGE (a)-[:STANDOFF_END]->(ec)

    RETURN collect(distinct a {.*}) AS annotations

    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { collectionUuid, annotations });

    return result.records[0]?.get('annotations');
  }
}
