import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import { toNativeTypes, toNeo4jTypes } from '../utils/helper.js';
import IAnnotation from '../models/IAnnotation.js';
import {
  AdditionalText,
  Annotation,
  AnnotationConfigEntity,
  AnnotationData,
  CollectionPostData,
  PropertyConfig,
  Text,
} from '../models/types.js';
import { IGuidelines } from '../models/IGuidelines.js';
import ICharacter from '../models/ICharacter.js';
import ICollection from '../models/ICollection.js';

/**
 * Data type for annotation data before saving them in the database. Contains only the
 * uuids of the nodes to be (dis-)connected with the annotation node instead of the complete node data.
 */
type ProcessedAnnotation = Omit<Annotation, 'data'> & {
  data: Omit<AnnotationData, 'entities' | 'additionalTexts'> & {
    additionalTexts: {
      deleted: AdditionalText[];
      created: CreatedAdditionalText[];
    };
    entities: {
      deleted: string[];
      created: string[];
    };
  };
};

type CreatedAdditionalText = Omit<AdditionalText, 'text'> & {
  text: Text & {
    characters: ICharacter[];
  };
};

export default class AnnotationService {
  /**
   * Process the annotations of the given collection to create annotation objects for saving. These objects contain
   * additional information or at least entries with empty arrays.
   *
   * The method is used to give collection anontations the same structure as text annotations, so that they
   * can be further processed and saved the same way. When the day has come where there are generic type handling
   * and data structures for annotations, this will be done in a more elegant way.
   *
   * @param {CollectionPostData} collection - The collection containing the annotations.
   * @returns {Partial<Annotation>[]} An array of annotation objects.
   */
  public createAnnotationObjectsFromCollection(
    collection: CollectionPostData,
  ): Partial<Annotation>[] {
    const annotations: AnnotationData[] = collection.data.annotations;
    const initialAnnotations: AnnotationData[] = collection.initialData.annotations;

    const annotationUuids: string[] = annotations.map(a => a.properties.uuid);

    const annotationObjects: Partial<Annotation>[] = [];

    // Create annotation objects for old annotations-> they will be deleted
    initialAnnotations.forEach(anno => {
      // Get only annotations that were deleted in by the user
      if (annotationUuids.includes(anno.properties.uuid)) {
        return;
      }

      annotationObjects.push({
        characterUuids: [],
        data: anno,
        initialData: anno,
        status: 'deleted',
      });
    });

    // Create annotation objects for all else annotations
    annotations.forEach(annotation => {
      const initial: AnnotationData | undefined = initialAnnotations.find(
        a => a.properties.uuid === annotation.properties.uuid,
      );

      annotationObjects.push({
        characterUuids: [],
        data: annotation,
        // No initial data -> annotation is new -> Use empty values for entities and additional texts
        // to create a minimal structure for further processing. Properties will not be used anyway.
        initialData:
          initial ??
          ({
            entities: {},
            additionalTexts: [],
            properties: {} as IAnnotation,
          } as AnnotationData),
        // "existing" or "created" doesn't matter here since they are handled the same way
        status: 'existing',
      });
    });

    return annotationObjects;
  }

  public async getAnnotations(nodeUuid: string): Promise<AnnotationData[]> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const entities: AnnotationConfigEntity[] =
      await guidelineService.getAvailableAnnotationEntityConfigs();

    const query: string = `
    // Match all annotations for given selection
    MATCH (n:Text|Collection {uuid: $nodeUuid})-[:HAS_ANNOTATION]->(a:Annotation)

    // Fetch additional nodes by label defined in the guidelines
    WITH a
    UNWIND $entities AS entity

    CALL {
        WITH a, entity
        
        // TODO: This query can be improved (direct label access instead of WHERE filter)
        CALL apoc.cypher.run(
            'MATCH (a)-[r:REFERS_TO]->(x) WHERE $nodeLabel IN labels(x) RETURN collect(x {.*}) AS nodes',
            {a: a, nodeLabel: entity.nodeLabel}
        ) YIELD value

        RETURN entity.category AS key, value.nodes AS nodes
    }

    // Create key-value pair with category and matched nodes
    WITH a AS annotations, collect({category: key, nodes: nodes}) AS entities

    // Fetch additional text nodes
    UNWIND annotations AS a

    CALL {
        WITH a

        MATCH (a)-[r:REFERS_TO]->(x:Collection)<-[:PART_OF]-(t2:Text)

        RETURN collect({
            collection: {
                nodeLabels: [l IN labels(x) WHERE l <> 'Collection' | l],
                data: x {.*}
            }, 
            text: {
                nodeLabels: [l IN labels(t2) WHERE l <> 'Text' | l],
                data: t2 {.*}
            }
        }) as additionalTexts

    }

    WITH a, entities, additionalTexts

    RETURN collect({
        properties: a {.*},
        entities: apoc.map.fromPairs([n in entities | [n.category, n.nodes]]),
        additionalTexts: additionalTexts
    }) AS annotations
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      nodeUuid,
      entities,
    });
    const rawAnnotations: AnnotationData[] = result.records[0]?.get('annotations');

    const annotations: AnnotationData[] = rawAnnotations.map(annotation =>
      toNativeTypes(annotation),
    ) as AnnotationData[];

    return annotations;
  }

  /**
   * Process the given annotations before saving them in the database. This simplifies the annotation structure and
   * converts JS native types to neo4j types.
   *
   * @param {Annotation[]} annotations - The annotations to be processed.
   * @return {Promise<ProcessedAnnotation[]>} A promise that resolves to the processed annotations.
   */
  private async processAnnotationsBeforeSaving(
    annotations: Partial<Annotation>[],
  ): Promise<ProcessedAnnotation[]> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    return annotations.map(annotation => {
      // Needed to convert the types of the annotation's node properties
      const annotationConfigFields: PropertyConfig[] =
        guidelineService.getAnnotationConfigFieldsFromGuidelines(
          guidelines,
          annotation.data!.properties.type,
        );

      const initialEntityUuids: string[] = Object.values(annotation.initialData!.entities)
        .flat()
        .map(item => item.uuid);

      const newEntityUuids: string[] = Object.values(annotation.data!.entities)
        .flat()
        .map(item => item.uuid);

      const createdEntityUuids: string[] = newEntityUuids.filter(
        uuid => !initialEntityUuids.includes(uuid),
      );

      const deletedEntityUuids: string[] = initialEntityUuids.filter(
        uuid => !newEntityUuids.includes(uuid),
      );

      // ------------------------------------------------------------------------------------------------
      // TODO: This needs to be restructured a lot

      const createdAdditionalTexts: CreatedAdditionalText[] = [];
      const deletedAdditionalTexts: AdditionalText[] = [];

      const oldTextUuids: string[] = annotation.initialData!.additionalTexts.map(
        t => t.collection.data.uuid,
      );
      const newTextUuids: string[] = annotation.data!.additionalTexts.map(
        t => t.collection.data.uuid,
      );

      // Characters need to be created to be saved in the query
      annotation.data!.additionalTexts.forEach(additionalText => {
        if (!oldTextUuids.includes(additionalText.collection.data.uuid)) {
          // Done here because collection field configuration may be different for each additional text
          const collectionConfigFields: PropertyConfig[] =
            guidelineService.getCollectionConfigFieldsFromGuidelines(
              guidelines,
              additionalText.collection.nodeLabels,
            );

          createdAdditionalTexts.push({
            collection: {
              nodeLabels: additionalText.collection.nodeLabels,
              data: toNeo4jTypes(
                additionalText.collection.data,
                collectionConfigFields,
              ) as ICollection,
            },
            text: {
              nodeLabels: additionalText.text.nodeLabels,
              data: additionalText.text.data,
              characters: additionalText.text.data.text.split('').map(c => {
                return {
                  text: c,
                  uuid: crypto.randomUUID(),
                };
              }),
            },
          });
        }
      });

      annotation.initialData!.additionalTexts.forEach(additionalText => {
        if (!newTextUuids.includes(additionalText.collection.data.uuid)) {
          deletedAdditionalTexts.push(additionalText);
        }
      });

      return {
        ...annotation,
        data: {
          properties: toNeo4jTypes(annotation.data!.properties, annotationConfigFields),
          entities: {
            deleted: deletedEntityUuids,
            created: createdEntityUuids,
          },
          additionalTexts: {
            created: createdAdditionalTexts,
            deleted: deletedAdditionalTexts,
          },
        },
      };
    }) as ProcessedAnnotation[];
  }

  public async saveAnnotations(
    nodeUuid: string,
    nodeLabel: 'Collection' | 'Text',
    annotations: Partial<Annotation>[],
  ): Promise<IAnnotation[]> {
    const processedAnnotations: ProcessedAnnotation[] =
      await this.processAnnotationsBeforeSaving(annotations);

    // console.dir(processedAnnotations, { depth: null });

    // TODO: Improve query speed, way too many db hits
    let query: string = `
    WITH $annotations as allAnnotations

    // 1. Delete deleted annotations
    CALL {
        UNWIND $annotations AS delAnnotation
        WITH delAnnotation
        WHERE delAnnotation.status = 'deleted'
        MATCH (a:Annotation {uuid: delAnnotation.data.properties.uuid})
        WITH a

        // Match subgraph
        CALL apoc.path.subgraphNodes(a, {
            relationshipFilter: 'REFERS_TO>|<PART_OF|HAS_ANNOTATION>',
            labelFilter: 'Collection|Text|Annotation'
        }) YIELD node

        WITH node, a

        OPTIONAL MATCH (node)-[:NEXT_CHARACTER*]->(ch:Character)

        DETACH DELETE a, node, ch
    }

    WITH allAnnotations

    MATCH (t:Text|Collection {uuid: $nodeUuid})

    // 2. Handle other annotations (merge)
    UNWIND allAnnotations AS ann
    WITH ann, t
    WHERE ann.status <> 'deleted'

    // Create (new) annotation node
    MERGE (a:Annotation {uuid: ann.data.properties.uuid})

    // Set data
    SET a = ann.data.properties

    // Create edge to text/collection node
    MERGE (t)-[:HAS_ANNOTATION]->(a)

    // Remove edges to nodes that are not longer part of the annotation data
    WITH ann, a

    CALL {
        WITH ann, a
        UNWIND ann.data.entities.deleted AS deleteUuid
        MATCH (a)-[r:REFERS_TO]->(e:Entity {uuid: deleteUuid})
        DELETE r
    }

    // Create edges to nodes that were added to the annotation data
    CALL {
        WITH ann, a
        UNWIND ann.data.entities.created AS createdUuid
        MATCH (e:Entity {uuid: createdUuid})
        MERGE (a)-[r:REFERS_TO]->(e)
    }

    // Remove additional text nodes
    CALL {
        WITH ann, a
        UNWIND ann.data.additionalTexts.deleted as textToDelete

        // Match Collection node that is the entry point into subgraph
        OPTIONAL MATCH (a)-[:REFERS_TO]->(c:Collection {uuid: textToDelete.collection.data.uuid})
        
        // Match subgraph
        CALL apoc.path.subgraphNodes(c, {
            relationshipFilter: '<PART_OF|HAS_ANNOTATION>|REFERS_TO>',
            labelFilter: 'Collection|Text|Annotation'
        }) YIELD node

        WITH c, node, a

        OPTIONAL MATCH (node)-[:NEXT_CHARACTER*]->(ch:Character)
        
        DETACH DELETE c, node, ch
    }

    // Create additional text nodes
    CALL {
        WITH ann, a
        UNWIND ann.data.additionalTexts.created as textToCreate
        
        CREATE (a)-[:REFERS_TO]->(c:Collection)<-[:PART_OF]-(t:Text)

        WITH textToCreate, a, c, t

        CALL apoc.create.addLabels(c, textToCreate.collection.nodeLabels) YIELD node
        SET c += textToCreate.collection.data
        SET t += textToCreate.text.data

        WITH textToCreate, a, c, t

        CALL atag.chains.update(t.uuid, null, null, textToCreate.text.characters, {
          textLabel: "Text",
          elementLabel: "Character",
          relationshipType: "NEXT_CHARACTER"
        }) YIELD path

        RETURN collect(textToCreate) as createdText
    }
    `;

    // Return if annotations are attached to Collection node
    if (nodeLabel === 'Collection') {
      query += `RETURN collect(distinct a {.*}) as annotations`;
    }

    // Character-specific operations that are only applied for Text annotations
    if (nodeLabel === 'Text') {
      query += `
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
      
      MATCH (t:Text {uuid: $nodeUuid})-[:NEXT_CHARACTER*]->(ch:Character)
      WITH collect(ch) as characters, annotations

      UNWIND range(0, size(characters) - 1) AS idx
      WITH characters[idx] AS ch, idx, annotations

      OPTIONAL MATCH (ch)<-[:STANDOFF_START]-(aStart:Annotation)
      OPTIONAL MATCH (ch)<-[:STANDOFF_END]-(aEnd:Annotation)

      SET aStart.startIndex = idx
      SET aEnd.endIndex = idx

      RETURN annotations
      `;
    }

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      nodeUuid,
      annotations: processedAnnotations,
    });

    return result.records[0]?.get('annotations');
  }
}
