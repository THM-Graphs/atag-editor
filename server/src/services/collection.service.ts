import { int, QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import GuidelinesService from './guidelines.service.js';
import { toNativeTypes, toNeo4jTypes } from '../utils/helper.js';
import NotFoundError from '../errors/not-found.error.js';
import IAnnotation from '../models/IAnnotation.js';
import ICollection from '../models/ICollection.js';
import { IGuidelines } from '../models/IGuidelines.js';
import {
  CollectionAccessObject,
  PaginationResult,
  CollectionPostData,
  PropertyConfig,
  Text,
  Collection,
} from '../models/types.js';

type CollectionTextObject = {
  all: Text[];
  created: Text[];
  deleted: Text[];
};

export default class CollectionService {
  /**
   * Retrieves paginated collection nodes together with connected text nodes. Additional node labels for the collection node
   * as well as pagination parameters are provided.
   *
   * @param {string} additionalLabel - The additional label to match in the query, e.g., "Letter".
   * @param {string} sort - The field by which to sort the collections.
   * @param {string} order - The order in which to sort the collections (ascending or descending).
   * @param {number} limit - The maximum number of collections to return.
   * @param {number} skip - The number of collections to skip before starting to collect the result set.
   * @param {string} search - The search string to filter collections by their label.
   * @return {Promise<PaginationResult<CollectionAccessObject[]>>} A promise that resolves to a paginated result of collection access objects.
   */
  public async getCollections(
    additionalLabel: string,
    sort: string,
    order: string,
    limit: number,
    skip: number,
    search: string,
  ): Promise<PaginationResult<CollectionAccessObject[]>> {
    const countQuery: string = `
    MATCH (c:Collection:${additionalLabel})
    WHERE c.label CONTAINS $search
    RETURN count(c) AS totalRecords
    `;

    // TODO: Should Annotations be included here?
    const dataQuery: string = `
    MATCH (c:Collection:${additionalLabel})
    WHERE toLower(c.label) CONTAINS $search

    WITH c
    ORDER BY c.${sort} ${order}
    SKIP ${skip}
    LIMIT ${limit}

    // Match optional Text node chain
    OPTIONAL MATCH (c)<-[:PART_OF]-(tStart:Text)
    WHERE NOT ()-[:NEXT]->(tStart)
    OPTIONAL MATCH (tStart)-[:NEXT*]->(t:Text)

    WITH c, tStart, collect(t) AS nextTexts
    WITH c, coalesce(tStart, []) + nextTexts AS texts

    RETURN collect({
        collection: {
            nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
            data: c {.*}
        }, 
        texts: [
            t IN texts | {
                nodeLabels: [l IN labels(t) WHERE l <> 'Text' | l],
                data: t {.*}
            }
        ]
    }) AS collections
    `;

    const [countResult, dataResult] = await Promise.all([
      Neo4jDriver.runQuery(countQuery, { search }),
      Neo4jDriver.runQuery(dataQuery, {
        skip: int(skip),
        limit: int(limit),
        sort: int(sort),
        order,
        search,
      }),
    ]);

    const totalRecords: number = countResult.records[0]?.get('totalRecords') || 0;
    const rawData: CollectionAccessObject[] = dataResult.records[0]?.get('collections') || [];

    const data: CollectionAccessObject[] = rawData.map(cao =>
      toNativeTypes(cao),
    ) as CollectionAccessObject[];

    return {
      data,
      pagination: {
        limit,
        order,
        search,
        skip,
        sort,
        totalRecords,
      },
    };
  }

  /**
   * Retrieves data of a specified collection node.
   *
   * @param {string} uuid - The UUID of the collection node to retrieve.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<ICollection>} A promise that resolves to the retrieved collection.
   */
  public async getCollectionById(uuid: string): Promise<ICollection> {
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})
    RETURN c {.*} AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const collection: ICollection = result.records[0]?.get('collection');

    if (!collection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return collection;
  }

  /**
   * Retrieves collection node with given UUID together with connected text nodes. Annotation nodes will be retrieved 
   * by a separate query from the `AnnotationService`.
  
   * @param {string} uuid - The UUID of the collection node to retrieve.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<Omit<CollectionAccessObject, 'annotations'>>} A promise that resolves to the retrieved collection and text nodes, but not the annotations nodes.
   */
  public async getExtendedCollectionById(
    uuid: string,
  ): Promise<Omit<CollectionAccessObject, 'annotations'>> {
    // TODO: This query is not working with more than one additional node label. Considerate
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})

    // Match optional Text node chain
    OPTIONAL MATCH (c)<-[:PART_OF]-(tStart:Text)
    WHERE NOT ()-[:NEXT]->(tStart)
    OPTIONAL MATCH (tStart)-[:NEXT*]->(t:Text)

    WITH c, tStart, collect(t) AS nextTexts
    WITH c, coalesce(tStart, []) + nextTexts AS texts    
    WITH c, texts

    RETURN {
        collection: {
            nodeLabels: [l IN labels(c) WHERE l <> 'Collection' | l],
            data: c {.*}
        }, 
        texts: [
            t IN texts | {
                nodeLabels: [l IN labels(t) WHERE l <> 'Text' | l],
                data: t {.*}
            }
        ]
    } AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const rawCollection: Omit<CollectionAccessObject, 'annotations'> =
      result.records[0]?.get('collection');

    if (!rawCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    const collection: Omit<CollectionAccessObject, 'annotations'> = toNativeTypes(
      rawCollection,
    ) as Omit<CollectionAccessObject, 'annotations'>;

    return collection;
  }

  /**
   * Creates a new collection node with the given data.
   *
   * While node labels and data of the collection node are mandatory, "texts" will always be an empty array
   * (not possibility to create on collection creation process) and "annotations" can be empty as well as with items.
   *
   * @param {CollectionAccessObject} data - The data to set for the collection node.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<ICollection>} A promise that resolves to the created collection node.
   */
  public async createNewCollection(data: CollectionAccessObject): Promise<ICollection> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    const collectionFields: PropertyConfig[] =
      guidelineService.getCollectionConfigFieldsFromGuidelines(
        guidelines,
        data.collection.nodeLabels,
      );

    const collection: Collection = {
      nodeLabels: [...data.collection.nodeLabels, 'Collection'],
      data: {
        ...toNeo4jTypes(data.collection.data, collectionFields),
        uuid: crypto.randomUUID(),
      } as ICollection,
    };

    // TODO: Improve this (own type?)
    const annotations: any = data.annotations.map(a => {
      const annotationConfigFields: PropertyConfig[] =
        guidelineService.getAnnotationConfigFieldsFromGuidelines(guidelines, a.properties.type);

      return {
        properties: toNeo4jTypes(a.properties, annotationConfigFields) as IAnnotation,
        normdata: Object.values(a.normdata)
          .flat()
          .map(i => i.uuid),
        additionalTexts: a.additionalTexts.map(additionalText => {
          const collectionConfigFields: PropertyConfig[] =
            guidelineService.getCollectionConfigFieldsFromGuidelines(
              guidelines,
              additionalText.collection.nodeLabels,
            );

          return {
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
                  letterLabel: additionalText.collection.data.label,
                  text: c,
                  uuid: crypto.randomUUID(),
                };
              }),
            },
          };
        }),
      };
    });

    const query: string = `
    CALL apoc.create.node($collection.nodeLabels, $collection.data) YIELD node as c

    CALL {
        WITH c

        UNWIND $annotations AS ann

        WITH ann, c

        // Create new annotation node
        MERGE (a:Annotation {uuid: ann.properties.uuid})

        // Set data
        SET a = ann.properties

        // Create edge to collection node
        MERGE (t)-[:HAS_ANNOTATION]->(a)

        // Remove edges to nodes that are not longer part of the annotation data
        WITH ann, a, c

        // Create edges to Entity nodes
        CALL {
            WITH ann, a
            UNWIND ann.normdata AS createdUuid
            MATCH (e:Entity {uuid: createdUuid})
            MERGE (a)-[r:REFERS_TO]->(e)
        }

        // Create additional text nodes
        CALL {
            WITH ann, a
            UNWIND ann.additionalTexts as textToCreate
            
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

        RETURN collect(a) as createdAnnotations
    }

    RETURN c {.*} AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      data,
      collection,
      annotations,
    });

    return result.records[0]?.get('collection');
  }

  public processCollectionTextsBeforeSaving(data: CollectionPostData): CollectionTextObject {
    const newData: CollectionAccessObject = data.data;
    const initialData: CollectionAccessObject = data.initialData;

    const initialTextUuids: string[] = initialData.texts.map(t => t.data.uuid);
    const newTextUUids: string[] = newData.texts.map(t => t.data.uuid);

    const createdTexts: Text[] = newData.texts.filter(
      text => !initialTextUuids.includes(text.data.uuid),
    );

    const deletedTexts: Text[] = initialData.texts.filter(
      text => !newTextUUids.includes(text.data.uuid),
    );

    const collectionTextObject: CollectionTextObject = {
      all: newData.texts,
      created: createdTexts,
      deleted: deletedTexts,
    };

    return collectionTextObject;
  }

  /**
   * Updates the properties of a Collection node with given UUID as well as its Text node network
   * (creating new nodes, deleting old nodes, changing order of existing nodes).
   *
   * @param {string} uuid - The UUID of the collection node to update.
   * @param {CollectionPostData} data - The data containing updates for the collection.
   * @throws {NotFoundError} If the collection with the specified UUID is not found.
   * @return {Promise<ICollection>} A promise that resolves to the updated collection node.
   */
  public async updateCollection(uuid: string, data: CollectionPostData): Promise<ICollection> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const fields: PropertyConfig[] = await guidelineService.getCollectionConfigFields(
      data.data.collection.nodeLabels,
    );

    const texts: CollectionTextObject = this.processCollectionTextsBeforeSaving(data);
    const collection: Collection = {
      nodeLabels: data.data.collection.nodeLabels,
      data: toNeo4jTypes(data.data.collection.data, fields) as ICollection,
    };

    const query: string = `
    MATCH (c:Collection {uuid: $uuid})
    
    SET c = $collection.data

    WITH c, [l IN labels(c) WHERE l <> 'Collection'] AS labelsToRemove

    CALL apoc.create.removeLabels(c, labelsToRemove) YIELD node AS nodeBefore
    CALL apoc.create.addLabels(c, $collection.nodeLabels) YIELD node AS nodeAfter

    WITH c

    // Delete Text nodes
    CALL {
      UNWIND $texts.deleted as textToDelete
      MATCH (t:Text {uuid: textToDelete.data.uuid})
      
      // Match subgraph
      CALL apoc.path.subgraphNodes(t, {
          relationshipFilter: 'HAS_ANNOTATION>|REFERS_TO>|<PART_OF',
          labelFilter: 'Collection|Text|Annotation'
      }) YIELD node

      WITH t, node

      OPTIONAL MATCH (node)-[:NEXT_CHARACTER*]->(ch:Character)

      DETACH DELETE t, node, ch
    }

    // Create Text nodes
    CALL {
      WITH c

      UNWIND $texts.created as textToCreate
      MERGE (t:Text {uuid: textToCreate.data.uuid})-[:PART_OF]->(c)
      WITH t, textToCreate
      SET t = textToCreate.data

      RETURN collect(t) as createdTexts
    }

    // Set new labels to ALL text nodes
    CALL {
      WITH c

      UNWIND $texts.all as text
      MATCH (c)<-[:PART_OF]-(t:Text {uuid: text.data.uuid})
      WITH t, text, [l IN labels(t) WHERE l <> 'Text'] AS labelsToRemove
      CALL apoc.create.removeLabels(t, labelsToRemove) YIELD node AS nodeBefore
      CALL apoc.create.addLabels(t, text.nodeLabels) YIELD node AS nodeAfter

      RETURN collect(t) as relabeledTexts
    }
    
    // Remove NEXT relationships from all texts
    CALL {
      WITH c
      MATCH (c)<-[:PART_OF]->(t:Text)-[r:NEXT]->(t2:Text)
      DETACH DELETE r
    }

    // Create new chain of NEXT relationships between nodes
    CALL {
        WITH c

        UNWIND range(0, size($texts.all) - 2) AS idx
        
        MATCH (t1:Text {uuid: $texts.all[idx].data.uuid})
        MATCH (t2:Text {uuid: $texts.all[idx + 1].data.uuid})
        MERGE (t1)-[:NEXT]->(t2)
        
        RETURN collect(t1) as updatedTexts
    }

    RETURN c {.*} AS collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid, collection, texts });
    const updatedCollection: ICollection = result.records[0]?.get('collection');

    if (!updatedCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return updatedCollection;
  }

  /**
   * Deletes a collection node with given UUID, along with an associated text node.
   *
   * @param {string} uuid - The UUID of the collection node to delete.
   * @return {Promise<ICollection>} A promise that resolves to the deleted collection.
   */
  public async deleteCollection(uuid: string): Promise<ICollection> {
    // TODO: Update query so that it matches the whole subgraph
    const query: string = `
    MATCH (c:Collection {uuid: $uuid})<-[:PART_OF]-(t:Text)
    OPTIONAL MATCH (t)-[:NEXT_CHARACTER*]->(chars:Character)
    WITH c, t, chars, c {.*} as collection
    DETACH DELETE c, t, chars
    RETURN collection
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuid });
    const deletedCollection: ICollection = result.records[0]?.get('collection');

    if (!deletedCollection) {
      throw new NotFoundError(`Collection with UUID ${uuid} not found`);
    }

    return deletedCollection;
  }
}
