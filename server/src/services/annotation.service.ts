import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import { createCharactersFromText, toNativeTypes, toNeo4jTypes } from '../utils/helper.js';
import { NodeDto } from '../models/types.js';
import {
  AdditionalText,
  Annotation,
  AnnotationData,
  CollectionPostData,
  EntityNode,
  PropertyConfig,
  TextNode,
} from '../models/types.js';
import { IGuidelines } from '../models/IGuidelines.js';
import ICharacter from '../models/ICharacter.js';
import { IAnnotation } from '../models/IAnnotation.js';

type FlatAnnotationTree = {
  rootUuid: string;
  annotationNodes: AnnotationNodeRecord[];
  edges: AnnotationRecordEdge[];
};
type AnnotationNodeRecord = NodeDto;
type AnnotationRecordEdge = {
  startUuid: string;
  endUuid: string;
};

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
      deleted: EntityNode[];
      created: EntityNode[];
    };
  };
};

type CreatedAdditionalText = Omit<AdditionalText, 'text'> & {
  text: TextNode & {
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
            entities: [],
            additionalTexts: [],
            properties: {} as IAnnotation,
          } as AnnotationData),
        // "existing" or "created" doesn't matter here since they are handled the same way
        status: 'existing',
      });
    });

    return annotationObjects;
  }

  /**
   * Converts a flat annotation tree structure (as returned by the database) into a nested {@link NodeDto} tree.
   *
   * Each record contains all annotation nodes for one top-level annotation, the `HAS_ANNOTATION` edges between
   * them, and the `REFERS_TO` nodes already attached to each annotation. The method reconstructs the nesting
   * by building an adjacency map from the edges and recursing from the root UUID downward.
   *
   * The method is used to generate a nested annotation structure that can be easily consumed by the frontend.
   *
   * @param flatTrees - Flat annotation trees, one per top-level annotation.
   * @returns A nested {@link NodeDto} array representing the full annotation tree.
   */
  private buildAnnotationNodeTree(flatTrees: FlatAnnotationTree[]): NodeDto[] {
    return flatTrees.map(tree => {
      const { rootUuid, annotationNodes, edges } = tree;

      const nodeMap = new Map<string, NodeDto>(annotationNodes.map(n => [n.node.data.uuid, n]));
      const adjacency = new Map<string, string[]>();

      edges.forEach((edge: AnnotationRecordEdge) => {
        const children = adjacency.get(edge.startUuid) ?? [];
        children.push(edge.endUuid);
        adjacency.set(edge.startUuid, children);
      });

      const buildNestedDto = (uuid: string): NodeDto => {
        const root: NodeDto = nodeMap.get(uuid)!;

        // Current root node
        const nodeData = {
          nodeLabels: root.node.nodeLabels,
          data: toNativeTypes(root.node.data),
        } as NodeDto['node'];

        // Create node data for children and traverse further into their children using the adjacency list
        const children = [
          ...root.connectedNodes.map((child: NodeDto) => ({
            node: toNativeTypes(child.node) as NodeDto['node'],
            connectedNodes: [],
          })),
          ...(adjacency.get(uuid) ?? []).map(n => buildNestedDto(n)),
        ];

        return {
          node: nodeData,
          connectedNodes: children,
        };
      };

      return buildNestedDto(rootUuid);
    });
  }

  public async getAnnotations(nodeUuid: string): Promise<NodeDto[]> {
    const query: string = `
    MATCH (n:Content|Collection {uuid: $nodeUuid})-[:HAS_ANNOTATION]->(a:Annotation)

    // Traverse the HAS_ANNOTATION tree if it exists (it has an unknown depth)
    CALL apoc.path.subgraphAll(a, {
        relationshipFilter: 'HAS_ANNOTATION>',
        nodeFilter: 'Annotation',
        maxLevel: -1
    }) YIELD nodes, relationships

    // Store relationships for later
    WITH 
        a,
        nodes,
        [rel IN relationships | {
            startUuid: startNode(rel).uuid, 
            endUuid: endNode(rel).uuid 
        }] AS edges

    // For each annotation node, get the directly via REFERS_TO connected nodes (Entity, Collection or Text)
    UNWIND nodes AS annotationNode
    OPTIONAL MATCH (annotationNode)-[:REFERS_TO]->(leaf:Entity|Collection|Text)

    WITH a, edges, annotationNode, collect(leaf) AS leaves

    WITH a, edges, collect({
        node: {nodeLabels: labels(annotationNode), data: annotationNode {.*}},
        connectedNodes: [l IN leaves | {
            node: { nodeLabels: labels(l), data: l {.*} },
            connectedNodes: []
        }]
    }) AS annotationNodes

    // Add flattened tree structure to result
    RETURN collect({
        rootUuid: a.uuid,
        annotationNodes: annotationNodes,
        edges: edges
    }) as annotations
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { nodeUuid });
    const annotations: FlatAnnotationTree[] = result.records[0].get('annotations');

    return this.buildAnnotationNodeTree(annotations);
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

      const initialEntities: EntityNode[] = annotation.initialData!.entities;
      const newEntities: EntityNode[] = annotation.data!.entities;

      const initialEntityUuids: string[] = initialEntities.map(item => item.data.uuid);
      const newEntityUuids: string[] = newEntities.map(item => item.data.uuid);

      const createdEntities: EntityNode[] = newEntities.filter(
        entity => !initialEntityUuids.includes(entity.data.uuid),
      );

      // When entities are created from the editor, remove leading and trailing whitespace
      // TODO: When entities can contain more than just label, use the toNeo4jTypes function?
      createdEntities.forEach(e => (e.data.label = e.data.label.trim()));

      const deletedEntities: EntityNode[] = initialEntities.filter(
        entity => !newEntityUuids.includes(entity.data.uuid),
      );

      // ------------------------------------------------------------------------------------------------
      // TODO: This needs to be restructured a lot

      const createdAdditionalTexts: CreatedAdditionalText[] = [];
      const deletedAdditionalTexts: AdditionalText[] = [];

      const oldTextUuids: string[] = annotation.initialData!.additionalTexts.map(
        t => t.annotation.uuid,
      );
      const newTextUuids: string[] = annotation.data!.additionalTexts.map(t => t.annotation.uuid);

      // Characters need to be created to be saved in the query
      annotation.data!.additionalTexts.forEach(additionalText => {
        if (!oldTextUuids.includes(additionalText.annotation.uuid)) {
          createdAdditionalTexts.push({
            annotation: additionalText.annotation,
            text: {
              nodeLabels: additionalText.text.nodeLabels,
              data: additionalText.text.data,
              characters: createCharactersFromText(additionalText.text.data.text),
            },
          });
        }
      });

      annotation.initialData!.additionalTexts.forEach(additionalText => {
        if (!newTextUuids.includes(additionalText.annotation.uuid)) {
          deletedAdditionalTexts.push(additionalText);
        }
      });

      return {
        ...annotation,
        data: {
          properties: toNeo4jTypes(annotation.data!.properties, annotationConfigFields),
          entities: {
            deleted: deletedEntities,
            created: createdEntities,
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
    nodeLabel: 'Collection' | 'Content',
    annotations: Partial<Annotation>[],
  ): Promise<IAnnotation[]> {
    const processedAnnotations: ProcessedAnnotation[] =
      await this.processAnnotationsBeforeSaving(annotations);

    // TODO: Improve query speed, way too many db hits
    let query: string = `
    WITH $annotations as allAnnotations

    // 1. Delete deleted annotations
    CALL {
        UNWIND $annotations AS delAnnotation
        WITH delAnnotation
        WHERE delAnnotation.status = 'deleted'
        MATCH (a:Annotation {uuid: delAnnotation.data.properties.uuid})

        // Delete only Annotation node - additional texts (Annotation-Text) are kept for now
        DETACH DELETE a
    }

    WITH allAnnotations

    MATCH (t:Content|Collection {uuid: $nodeUuid})

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
        UNWIND ann.data.entities.deleted AS entityToDelete
        MATCH (a)-[r:REFERS_TO]->(e:Entity {uuid: entityToDelete.data.uuid})
        DELETE r
    }

    // Create edges to nodes that were added to the annotation data
    CALL {
        WITH ann, a
        UNWIND ann.data.entities.created AS entityToCreate
        MERGE (e:Entity {uuid: entityToCreate.data.uuid, label: entityToCreate.data.label})
        WITH e, entityToCreate, a
        CALL apoc.create.addLabels(e, entityToCreate.nodeLabels) YIELD node AS updatedEntityNode
        MERGE (a)-[r:REFERS_TO]->(e)
    }

    // Remove additional text nodes
    CALL {
        WITH ann, a
        UNWIND ann.data.additionalTexts.deleted as textToDelete

        // Match Annotation node that is the entry point into subgraph
        OPTIONAL MATCH (a)-[r:HAS_ANNOTATION]->(:Annotation {uuid: textToDelete.annotation.uuid})

        // Detach Annotation node, but keep it in the database for now.
        DELETE r
    }

    // Create additional text nodes
    CALL {
        WITH ann, a
        UNWIND ann.data.additionalTexts.created as textToCreate
        
        CREATE (a)-[:HAS_ANNOTATION]->(aCommentary:Annotation)-[:REFERS_TO]->(t:Content)

        WITH textToCreate, a, aCommentary, t

        // Set properties
        SET aCommentary += textToCreate.annotation
        SET t += textToCreate.text.data

        WITH textToCreate, a, aCommentary, t

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
    if (nodeLabel === 'Content') {
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
      
      MATCH (t:Content {uuid: $nodeUuid})-[:NEXT_CHARACTER*]->(ch:Character)
      WITH collect(ch) as characters, annotations

      UNWIND range(0, size(characters) - 1) AS idx
      WITH characters[idx] AS ch, idx, annotations

      OPTIONAL MATCH (ch)<-[:STANDOFF_START]-(aStart:Annotation)
      OPTIONAL MATCH (ch)<-[:STANDOFF_END]-(aEnd:Annotation)

      SET aStart.startIndex = idx
      SET aEnd.endIndex = idx

      RETURN collect(distinct annotations) as annotations
      `;
    }

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      nodeUuid,
      annotations: processedAnnotations,
    });

    return result.records[0]?.get('annotations');
  }
}
