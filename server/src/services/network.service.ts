import { QueryResult } from 'neo4j-driver';
import Neo4jDriver from '../database/neo4j.js';
import NotFoundError from '../errors/not-found.error.js';
import { Text, Collection, NetworkPostData } from '../models/types.js';

/**
 * Service class for managing network operations on Collections and Text nodes.
 * Provides functionality to copy, move, delete, and dereference nodes within collection hierarchies.
 */
export default class NetworkService {
  /**
   * Attaches given nodes to the given target collection (= creates new `PART_OF` relationships), but keeps them attached
   * to their current parent collection(s).
   *
   * @param {NetworkPostData} data - The data containing the nodes to copy and the target collection.
   * @return {Promise<(Collection | Text)[]>} A promise that resolves to an array of the copied nodes.
   */
  async referenceNodes(data: NetworkPostData): Promise<(Collection | Text)[]> {
    const { nodes, target } = data;

    if (!target) {
      throw new NotFoundError(`No target collection provided`);
    }

    const targetUuid: string = target.data.uuid;

    const query: string = `
    MATCH (newParentCollection:Collection {uuid: $targetUuid})

    UNWIND $nodes as node
    MATCH (n:Collection|Text {uuid: node.data.uuid})
    MERGE (newParentCollection)<-[:PART_OF]-(n)
    
    RETURN collect(n) as updatedNodes
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { targetUuid, nodes });
    const updatedNodes: (Collection | Text)[] = result.records[0]?.get('updatedNodes');

    if (!updatedNodes) {
      throw new NotFoundError(`Collection with UUID ${targetUuid} not found`);
    }

    return updatedNodes;
  }

  /**
   * Deletes the given nodes, including their subgraph. Not yet implemented.
   *
   * @param {NetworkPostData} data - The data containing the nodes to delete and the origin collection.
   * @return {Promise<any>} A promise that resolves to an empty array.
   */
  async deleteNodes(data: NetworkPostData): Promise<any> {
    const { type, nodes, origin, target } = data;

    return [];
  }

  /**
   * Disconnects the given nodes from the given origin collection (= removes the `PART_OF` relationships).
   *
   * @param {NetworkPostData} data - The data containing the nodes to dereference and the origin collection.
   * @return {Promise<(Collection | Text)[]>} A promise that resolves to an array of the dereferenced nodes.
   */
  async dereferenceNodes(data: NetworkPostData): Promise<any> {
    const { nodes, origin } = data;

    if (!origin) {
      throw new NotFoundError(`No origin collection provided`);
    }

    const originUuid: string = origin.data.uuid;

    const query: string = `
    MATCH (oldParentCollection:Collection {uuid: $originUuid})

    UNWIND $nodes as node
    MATCH (n:Collection|Text {uuid: node.data.uuid})-[r:PART_OF]->(oldParentCollection)

    //Remove from parent
    DELETE r 

    RETURN collect(n) as updatedNodes
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { originUuid, nodes });

    const updatedNodes: (Collection | Text)[] = result.records[0]?.get('updatedNodes');

    if (!updatedNodes) {
      throw new NotFoundError(`Collection with UUID ${originUuid} not found`);
    }

    return updatedNodes;
  }

  /**
   * Moves the given nodes to the given target collection (= deletes the `PART_OF` relationship to the old parent
   * collection and creates ``PART_OF` relationships to the new parent collection).
   *
   * @param {NetworkPostData} data - The data containing the nodes to move and the origin and target collections.
   * @return {Promise<(Collection | Text)[]>} A promise that resolves to an array of the moved nodes.
   */
  async moveNodes(data: NetworkPostData): Promise<any> {
    const { nodes, origin, target } = data;

    if (!target || !origin) {
      throw new NotFoundError(`No target and/or origin collection provided`);
    }

    const originUuid: string = origin.data.uuid;
    const targetUuid: string = target.data.uuid;

    const query: string = `
    MATCH (oldParentCollection:Collection {uuid: $originUuid})
    MATCH (newParentCollection:Collection {uuid: $targetUuid})

    UNWIND $nodes as node
    MATCH (n:Collection|Text {uuid: node.data.uuid})-[r:PART_OF]->(oldParentCollection)

    // Connect to new parent, remove from old
    MERGE (newParentCollection)<-[:PART_OF]-(n)
    DELETE r  

    RETURN collect(n) as updatedNodes
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, {
      originUuid,
      targetUuid,
      nodes,
    });

    const updatedNodes: (Collection | Text)[] = result.records[0]?.get('updatedNodes');

    if (!updatedNodes) {
      throw new NotFoundError(`Collection with UUID ${targetUuid} not found`);
    }

    return updatedNodes;
  }

  async validatePath(uuids: string[]): Promise<Collection[]> {
    if (!uuids || uuids.length === 0) {
      return [];
    }

    const query: string = `
    UNWIND $uuids as uuid
    MATCH (c:Collection {uuid: uuid})
    WITH collect(c) as allowlistNodes

    MATCH (first:Collection{uuid: $uuids[0]})

    CALL apoc.path.expandConfig(first, {
        relationshipFilter: '<PART_OF',
        allowlistNodes: allowlistNodes
    }) YIELD path

    WITH collect(path)[-1] as longestPath

    WHERE [x in nodes(longestPath) | x.uuid] = $uuids

    RETURN [n in nodes(longestPath) | {
        data: n {.*},
        nodeLabels: [l IN labels(n) WHERE l <> 'Collection']
    }] as path
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { uuids });
    const path: Collection[] = result.records[0]?.get('path');

    if (!path) {
      throw new NotFoundError(`The path does not exist :/`);
    }

    return path;
  }
}
