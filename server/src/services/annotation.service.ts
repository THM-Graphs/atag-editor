import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import IAnnotation from '../models/IAnnotation.js';
import { AdditionalText, Annotation, AnnotationData, AnnotationType } from '../models/types.js';
import { IGuidelines } from '../models/IGuidelines.js';
import ICharacter from '../models/ICharacter.js';

/**
 * Data type for annotation data before saving them in the database. Contains only the
 * uuids of the nodes to be (dis-)connected with the annotation node instead of the complete node data.
 */
type ProcessedAnnotation = Omit<Annotation, 'data'> & {
  data: Omit<AnnotationData, 'normdata' | 'additionalTexts'> & {
    additionalTexts: {
      deleted: AdditionalText[];
      created: CreatedAdditionalText[];
    };
    normdata: {
      deleted: string[];
      created: string[];
    };
  };
};

type CreatedAdditionalText = AdditionalText & {
  data: {
    characters: ICharacter[];
  };
};

export default class AnnotationService {
  public async getAnnotations(textUuid: string): Promise<AnnotationData[]> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    const query: string = `
    // Match all annotations for given selection
    MATCH (t:Text {uuid: $textUuid})-[:HAS_ANNOTATION]->(a:Annotation)

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
    WITH a AS annotations, collect({category: key, nodes: nodes}) AS normdata

    // Fetch additional text nodes
    UNWIND annotations AS a
    UNWIND $guidelines.annotations.additionalTexts AS atLabel

    CALL {
        WITH a, atLabel

        MATCH (a)-[r:REFERS_TO]->(x:Collection)<-[:PART_OF]-(t2:Text)
        WHERE atLabel IN labels(x)
        RETURN collect({
            nodeLabel: atLabel,
            data: {
                collection: x {.*},
                text: t2{.*}
            }
        }) AS atNodes
    }

    WITH a, normdata, apoc.coll.flatten(collect(atNodes)) AS additionalTexts

    RETURN collect({
        properties: a {.*},
        normdata: apoc.map.fromPairs([n in normdata | [n.category, n.nodes]]),
        additionalTexts: additionalTexts
    }) AS annotations
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { textUuid, guidelines });

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
      // TODO: This needs to be restructured a lot

      const createdAdditionalTexts: CreatedAdditionalText[] = [];
      const deletedAdditionalTexts: AdditionalText[] = [];

      const oldTextUuids: string[] = annotation.initialData.additionalTexts.map(
        t => t.data.collection.uuid,
      );
      const newTextUuids: string[] = annotation.data.additionalTexts.map(
        t => t.data.collection.uuid,
      );

      // Characters need to be created to be saved in the query
      annotation.data.additionalTexts.forEach(additionalText => {
        if (!oldTextUuids.includes(additionalText.data.collection.uuid)) {
          createdAdditionalTexts.push({
            ...additionalText,
            data: {
              ...additionalText.data,
              characters: additionalText.data.text.text.split('').map(c => {
                return {
                  letterLabel: additionalText.data.collection.label,
                  text: c,
                  uuid: crypto.randomUUID(),
                };
              }),
            },
          });
        }
      });

      annotation.initialData.additionalTexts.forEach(additionalText => {
        if (!newTextUuids.includes(additionalText.data.collection.uuid)) {
          deletedAdditionalTexts.push(additionalText);
        }
      });

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
    textUuid: string,
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
        WITH a
        // Match connected Collection, Text and Annotation nodes. Collection nodes need to be matched separately
        // as entry point into subgraph, and from there can be matched safely in both directions 
        OPTIONAL MATCH (a)-[:REFERS_TO]->(c:Collection)
        -[:REFERS_TO | PART_OF | HAS_ANNOTATION*]-(x:Collection | Text | Annotation)
        WITH a, x, c
        // Find optional character chain for text nodes
        OPTIONAL MATCH (x)-[:NEXT_CHARACTER*]->(ch:Character)
        DETACH DELETE a, c, x, ch
    }

    WITH allAnnotations

    MATCH (t:Text {uuid: $textUuid})

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

    // Remove additional text nodes
    CALL {
        WITH ann, a
        UNWIND ann.data.additionalTexts.deleted as textToDelete

        // Match connected Collection, Text and Annotation nodes. Collection node needs to be matched separately
        // as entry point into subgraph, and from there can be matched safely in both directions 
        OPTIONAL MATCH (a)-[:REFERS_TO]->(c:Collection {uuid: textToDelete.data.collection.uuid})
        -[:REFERS_TO | PART_OF | HAS_ANNOTATION*]-(x:Collection | Text | Annotation)
        WITH c, x
        // Find optional character chain for Text nodes
        OPTIONAL MATCH (x)-[:NEXT_CHARACTER*]->(ch:Character)
        DETACH DELETE c, x, ch
    }

    // Create additional text nodes
    CALL {
        WITH ann, a
        UNWIND ann.data.additionalTexts.created as textToCreate
        
        CREATE (a)-[:REFERS_TO]->(c:Collection)<-[:PART_OF]-(t:Text)

        WITH textToCreate, a, c, t

        CALL apoc.create.addLabels(c, [textToCreate.nodeLabel]) YIELD node
        SET c += textToCreate.data.collection
        SET t += textToCreate.data.text

        WITH textToCreate, a, c, t

        CALL atag.chains.update(t.uuid, null, null, textToCreate.data.characters, {
          textLabel: "Text",
          elementLabel: "Character",
          relationshipType: "NEXT_CHARACTER"
        }) YIELD path

        RETURN collect(textToCreate) as createdText
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
    
    MATCH (t:Text {uuid: $textUuid})-[:NEXT_CHARACTER*]->(ch:Character)
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
      textUuid,
      annotations: processedAnnotations,
    });

    return result.records[0]?.get('annotations');
  }
}
