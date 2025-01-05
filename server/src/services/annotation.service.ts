import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import IAnnotation from '../models/IAnnotation.js';
import { Annotation, AnnotationConfigResource, AnnotationData } from '../models/types.js';
import { IGuidelines } from '../models/IGuidelines.js';

/**
 * Data type for annotation data before saving them in the database. Contains only the
 * uuids of the nodes to be (dis-)connected with the annotation node instead of the complete node data.
 */
type ProcessedAnnotation = Omit<Annotation, 'data'> & {
  data: Omit<AnnotationData, 'normdata'> & {
    normdata: {
      deleted: string[];
      created: string[];
    };
  };
};

export default class AnnotationService {
  public async getAnnotations(collectionUuid: string): Promise<AnnotationData[]> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();
    const resources: AnnotationConfigResource[] = guidelines.annotations.resources;

    const query: string = `
    // Match all annotations for given selection
    MATCH (c:Collection {uuid: $collectionUuid})-[:HAS_TEXT]->(t:Text)-[:HAS_ANNOTATION]->(a:Annotation)

    // Fetch additional nodes by label defined in the guidelines
    WITH a, $resources AS resources
    UNWIND resources AS resource
    
    CALL {
        WITH a, resource
        
        // TODO: This query can be improved (direct label access instead of WHERE filter)
        CALL apoc.cypher.run(
            'MATCH (a)-[r:REFERS_TO]->(x) WHERE $nodeLabel IN labels(x) RETURN collect(x {.*}) AS nodes',
            {a: a, nodeLabel: resource.nodeLabel}
        ) YIELD value

        RETURN resource.category AS key, value.nodes AS nodes
    }

    // Create key-value pair with category and matched nodes
    WITH a, collect({category: key, nodes: nodes}) AS normdata

    RETURN collect({
        properties: a {.*},
        normdata: apoc.map.fromPairs([m IN normdata | [m.category, m.nodes]])
    }) AS annotations
`;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { collectionUuid, resources });

    return result.records[0]?.get('annotations');
  }

  /**
   * Process the given annotations before saving them in the database.
   *
   * This function replaces the normdata of the annotation with an object with two entries: `deleted` and `created`.
   * Each entry contains the uuids of the nodes should be (dis-)connected to the annotation node. Used to simplify the cypher queries.
   *
   * @param {Annotation[]} annotations - The annotations to process.
   * @return {ProcessedAnnotation[]} The processed annotations.
   */
  public processAnnotationsBeforeSaving(annotations: Annotation[]): ProcessedAnnotation[] {
    return annotations.map(annotation => {
      const initialNormdataUuids: string[] = Object.values(annotation.initialData.normdata)
        .flat()
        .map(item => item.uuid);

      const newNormdataUuids: string[] = Object.values(annotation.data.normdata)
        .flat()
        .map(item => item.uuid);

      const createdUuids: string[] = newNormdataUuids.filter(
        uuid => !initialNormdataUuids.includes(uuid),
      );

      const deletedUuids: string[] = initialNormdataUuids.filter(
        uuid => !newNormdataUuids.includes(uuid),
      );

      return {
        ...annotation,
        data: {
          ...annotation.data,
          normdata: {
            deleted: deletedUuids,
            created: createdUuids,
          },
        },
      };
    });
  }

  public async saveAnnotations(
    collectionUuid: string,
    annotations: Annotation[],
  ): Promise<IAnnotation[]> {
    const processedAnnotations: ProcessedAnnotation[] =
      this.processAnnotationsBeforeSaving(annotations);

    console.log('Annotations to be saved:');
    console.dir(
      processedAnnotations.filter(ann => ann.data.properties.type === 'entity'),
      { depth: null },
    );

    // TODO: Improve query speed, way too many db hits
    const query: string = `
    WITH $annotations as allAnnotations

    // 1. Delete deleted annotations
    CALL {
        UNWIND $annotations AS delAnnotation
        WITH delAnnotation
        WHERE delAnnotation.status = 'deleted'
        MATCH (a:Annotation {uuid: delAnnotation.data.properties.uuid})
        DETACH DELETE a
    }

    WITH allAnnotations

    MATCH (c:Collection {uuid: $collectionUuid})-[:HAS_TEXT]->(t:Text)

    // 2. Handle other annotations (merge)
    UNWIND allAnnotations AS ann
    WITH ann, t
    WHERE ann.status <> 'deleted'

    // Create (new) annotation node
    MERGE (a:Annotation {uuid: ann.data.properties.uuid})

    // Set data
    SET a = ann.data.properties

    // Create edge to text node
    MERGE (t)-[:HAS_ANNOTATION]->(a)

    // Remove edges to nodes that are not longer part of the annotation data
    WITH ann, a

    CALL {
        WITH ann, a
        UNWIND ann.data.normdata.deleted AS deleteUuid
        MATCH (a)-[r:REFERS_TO]->(e:Entity {uuid: deleteUuid})
        DELETE r
    }

    // Create edges to nodes that were added to the annotation data
    CALL {
        WITH ann, a
        UNWIND ann.data.normdata.created AS createdUuid
        MATCH (e:Entity {uuid: createdUuid})
        MERGE (a)-[r:REFERS_TO]->(e)
    }

    // Remove existing relationships between annotation and character nodes before creating new ones
    CALL {
        WITH a
        MATCH (a)-[r:CHARACTER_HAS_ANNOTATION|STANDOFF_START|STANDOFF_END]-(:Character)
        DELETE r   
    }

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

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      collectionUuid,
      annotations: processedAnnotations,
    });

    return result.records[0]?.get('annotations');
  }
}
