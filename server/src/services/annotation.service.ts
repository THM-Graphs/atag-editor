import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import IAnnotation from '../models/IAnnotation.js';
import { Annotation, AnnotationData, AnnotationType } from '../models/types.js';
import { IGuidelines } from '../models/IGuidelines.js';
import IText from '../models/IText.js';

/**
 * Data type for annotation data before saving them in the database. Contains only the
 * uuids of the nodes to be (dis-)connected with the annotation node instead of the complete node data.
 */
type ProcessedAnnotation = Omit<Annotation, 'data'> & {
  data: Omit<AnnotationData, 'normdata' | 'additionalTexts'> & {
    additionalTexts: {
      deleted: AdditionalTextConfig[];
      created: AdditionalTextConfig[];
    };
    normdata: {
      deleted: string[];
      created: string[];
    };
  };
};

type AdditionalTextConfig = {
  config: any;
  data: IText;
};

export default class AnnotationService {
  public async getAnnotations(collectionUuid: string): Promise<AnnotationData[]> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    const query: string = `
    // Match all annotations for given selection
    MATCH (c:Collection {uuid: $collectionUuid})-[:HAS_TEXT]->(t:Text)-[:HAS_ANNOTATION]->(a:Annotation)

    // Fetch additional nodes by label defined in the guidelines
    WITH a, $guidelines.annotations.resources AS resources
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
    WITH a as annotations, collect({category: key, nodes: nodes}) AS normdata

    // Fetch additional text nodes
    UNWIND annotations as a

    CALL {
        WITH a
        
        UNWIND $guidelines.annotations.types as annoConfig

        WITH annoConfig, a
        WHERE annoConfig.type = a.type

        UNWIND annoConfig.additionalTexts as atConfig

        OPTIONAL MATCH (a)-[:REFERS_TO]->(c:Collection)-[:HAS_TEXT]->(t2:Text)
        WHERE atConfig.nodeLabel IN labels(c)

        RETURN apoc.map.fromPairs(collect([atConfig.name, c {.uuid, text: t2.text}])) AS additionalTexts
    }

    RETURN collect({
        properties: a {.*},
        normdata: apoc.map.fromPairs([n in normdata | [n.category, n.nodes]]),
        additionalTexts: additionalTexts
    }) AS annotations
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      collectionUuid,
      guidelines,
    });

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
  public async processAnnotationsBeforeSaving(
    annotations: Annotation[],
  ): Promise<ProcessedAnnotation[]> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    return annotations.map(annotation => {
      const initialNormdataUuids: string[] = Object.values(annotation.initialData.normdata)
        .flat()
        .map(item => item.uuid);

      const newNormdataUuids: string[] = Object.values(annotation.data.normdata)
        .flat()
        .map(item => item.uuid);

      const createdNormdataUuids: string[] = newNormdataUuids.filter(
        uuid => !initialNormdataUuids.includes(uuid),
      );

      const deletedNormdataUuids: string[] = initialNormdataUuids.filter(
        uuid => !newNormdataUuids.includes(uuid),
      );

      // ------------------------------------------------------------------------------------------------

      const createdAdditionalTexts: AdditionalTextConfig[] = [];
      const deletedAdditionalTexts: AdditionalTextConfig[] = [];

      const annotationConfig: AnnotationType | undefined = guidelines.annotations.types.find(
        t => t.type === annotation.data.properties.type,
      );

      for (const [fieldName, text] of Object.entries(annotation.data.additionalTexts)) {
        const additionalTextConfig = annotationConfig!.additionalTexts.find(
          at => at.name === fieldName,
        );

        const newText: IText | null = text;
        const oldText: IText | null = annotation.initialData.additionalTexts[fieldName];

        // If nothing was changed, skip
        if (!newText && !oldText) {
          continue;
        }

        // Text added
        if (newText !== null && oldText === null) {
          createdAdditionalTexts.push({
            data: newText,
            config: additionalTextConfig,
          });
        }

        // Text removed
        if (!newText && oldText !== null) {
          deletedAdditionalTexts.push({
            data: oldText,
            config: additionalTextConfig,
          });
        }

        // Text reference changed
        if (newText !== null && oldText !== null && newText.uuid !== oldText.uuid) {
          createdAdditionalTexts.push({
            data: newText,
            config: additionalTextConfig,
          });
          deletedAdditionalTexts.push({
            data: oldText,
            config: additionalTextConfig,
          });
        }
      }

      // console.log('added:', createdAdditionalTexts);
      // console.log('deleted:', deletedAdditionalTexts);

      return {
        ...annotation,
        data: {
          ...annotation.data,
          normdata: {
            deleted: deletedNormdataUuids,
            created: createdNormdataUuids,
          },
          additionalTexts: {
            created: createdAdditionalTexts,
            deleted: deletedAdditionalTexts,
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
      await this.processAnnotationsBeforeSaving(annotations);

    console.dir(processedAnnotations, { depth: null });

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
        // TODO: This should also delete character chain, annotations etc. (essentially the whole network)
        // OPTIONAL MATCH (a)-[:REFERS_TO]->(c:Collection)-[:HAS_TEXT]->(t:Text)
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

    // Conditionally merge REFERS_TO relationship to additional Text node
    // The doubled WITH clause is needed since the WHERE clause does not work otherwise
    // (see https://neo4j.com/docs/cypher-manual/current/subqueries/call-subquery/#importing-with)
    // CALL {
    //     WITH ann, a
    //       WITH ann, a
    //       // TODO: Should the guidelines be checked also? To prevent unwanted operations...
    //       WHERE ann.data.additionalText IS NOT NULL
    //     MERGE (a)-[:REFERS_TO]->(t:Text {uuid: ann.data.additionalText.uuid})
    // }

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
