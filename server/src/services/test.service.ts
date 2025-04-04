import { DateTime, QueryResult } from 'neo4j-driver';
import NotFoundError from '../errors/not-found.error.js';
import Neo4jDriver from '../database/neo4j.js';
import { toNativeTypes, toNeo4jTypes } from '../utils/helper.js';
import GuidelinesService from './guidelines.service.js';
import { IGuidelines } from '../models/IGuidelines.js';
import { PropertyConfig } from '../models/types.js';

export default class TestService {
  public async getTestNode(): Promise<any> {
    const query: string = `
    MATCH (d:DataTypeExample)
    RETURN d {.*} as test
    `;

    const result: QueryResult = await Neo4jDriver.runQuery(query);
    // console.log('cypher:');
    // console.dir(result.records[0]?.get('test'), { depth: null });
    // console.log('Properties after conversion:');
    // le.dir(toNativeTypes(result.records[0]?.get('test')), { depth: null });

    return toNativeTypes(result.records[0]?.get('test'));
  }

  public async saveTestNode(data: any): Promise<any> {
    const guidelineService: GuidelinesService = new GuidelinesService();
    const guidelines: IGuidelines = await guidelineService.getGuidelines();

    // TODO: This should come from the guidelines :)
    const fields: PropertyConfig[] = [
      // BOOLEAN property configurations
      {
        name: 'singleBoolean',
        type: 'boolean',
        required: true,
        editable: true,
        visible: true,
      },
      {
        name: 'booleanList',
        type: 'array',
        items: {
          type: 'boolean',
        },
        required: false,
        editable: true,
        visible: true,
      },

      // STRING property configurations
      {
        name: 'singleString',
        type: 'string',
        required: true,
        editable: true,
        visible: true,
        template: 'input',
      },
      {
        name: 'stringList',
        type: 'array',
        items: {
          type: 'string',
        },
        required: false,
        editable: true,
        visible: true,
      },

      // INTEGER property configurations
      {
        name: 'singleInteger',
        type: 'integer',
        required: true,
        editable: true,
        visible: true,
      },
      {
        name: 'integerList',
        type: 'array',
        items: {
          type: 'integer',
        },
        required: false,
        editable: true,
        visible: true,
      },

      // FLOAT property configurations
      {
        name: 'singleFloat',
        type: 'number',
        required: true,
        editable: true,
        visible: true,
      },
      {
        name: 'floatList',
        type: 'array',
        items: {
          type: 'number',
        },
        required: false,
        editable: true,
        visible: true,
      },

      // DATE property configurations
      {
        name: 'singleDate',
        type: 'date',
        required: false,
        editable: true,
        visible: true,
        template: 'input',
      },
      {
        name: 'dateList',
        type: 'array',
        items: {
          type: 'date',
        },
        required: false,
        editable: true,
        visible: true,
      },

      // LOCAL DATETIME property configurations
      {
        name: 'singleLocalDateTime',
        type: 'date-time',
        required: false,
        editable: true,
        visible: true,
        template: 'input',
      },
      {
        name: 'localDateTimeList',
        type: 'array',
        items: {
          type: 'date-time',
        },
        required: false,
        editable: true,
        visible: true,
      },

      // LOCAL TIME property configurations
      {
        name: 'singleLocalTime',
        type: 'time',
        required: false,
        editable: true,
        visible: true,
        template: 'input',
      },
      {
        name: 'localTimeList',
        type: 'array',
        items: {
          type: 'time',
        },
        required: false,
        editable: true,
        visible: true,
      },
    ];

    // console.log('NORMAL\n -----');
    // console.log(data);

    // console.log('CONVERTED\n -----');
    // console.log(toNeo4jTypes(data, fields));

    // return {};

    data = toNeo4jTypes(data, fields);

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
