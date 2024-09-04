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

    // Workaround: Detach delete matched node (if it exists). Faster than deleting all relationships from existing node
    OPTIONAL MATCH (aDel:Annotation {uuid: ann.data.uuid})
    DETACH DELETE (aDel)

    // Create new annotation node
    CREATE (a:Annotation {uuid: ann.data.uuid})

    // Set data
    SET a = ann.data

    // Create edge to text node
    MERGE (t)-[:HAS_ANNOTATION]->(a)

    // Remove existing relationships between annotation and character nodes before creating new ones
    WITH a, ann

    // OPTIONAL MATCH (a)-[r:CHARACTER_HAS_ANNOTATION|STANDOFF_START|STANDOFF_END]-(c:Character)
    // DELETE r   

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

    WITH collect(distinct a {.*}) as annotations

    // Set startIndex and andIndex properties of Annotation nodes
    
    MATCH (c:Collection {uuid: $collectionUuid})-[:HAS_TEXT]->(t:Text)-[:NEXT_CHARACTER*]->(ch:Character)
    WITH collect(ch) as characters, annotations

    UNWIND range(0, size(characters) - 1) AS idx
    WITH characters[idx] AS ch, idx, annotations

    OPTIONAL MATCH (ch)<-[:STANDOFF_START]-(aStart:Annotation)
    OPTIONAL MATCH (ch)<-[:STANDOFF_END]-(aEnd:Annotation)

    SET aStart.startIndex = idx
    SET aEnd.endIndex = idx

    RETURN annotations
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { collectionUuid, annotations });

    return result.records[0]?.get('annotations');
  }
}
