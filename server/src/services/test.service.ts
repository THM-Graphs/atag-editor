import { DateTime, QueryResult } from 'neo4j-driver';
import NotFoundError from '../errors/not-found.error.js';
import Neo4jDriver from '../database/neo4j.js';
import { toNativeTypes } from '../utils/helper.js';

export default class TestService {
  public async getTestNode(): Promise<any> {
    const query: string = `
    MATCH (d:DataTypeExample)
    RETURN d {.*} as test
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query);
    console.log('cypher:');
    console.dir(result.records[0]?.get('test'), { depth: null });
    console.log('JS:');
    console.dir(toNativeTypes(result.records[0]?.get('test')), { depth: null });

    return result.records[0]?.get('test');
  }

  public async saveTestNode(data: any): Promise<any> {
    const query: string = `
    MATCH (d:DataTypeExample)
    SET d = $data
    RETURN d {.*} as test
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query, { data });

    console.dir(result.records[0]?.get('test'), { depth: null });

    return result.records[0]?.get('test');
  }
}
