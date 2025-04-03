import { Request } from 'express';
import {
  int,
  isDate,
  isDateTime,
  isDuration,
  isInt,
  isLocalDateTime,
  isLocalTime,
  isTime,
  types,
} from 'neo4j-driver';
import { PropertyConfig } from '../models/types.js';

/**
 * Capitalizes the first letter of a given string.
 *
 * @param {string} inputString - The string to be capitalized.
 * @return {string} The input string with the first letter capitalized.
 */
export function capitalize(inputString: string): string {
  return inputString.charAt(0).toUpperCase() + inputString.slice(1);
}

/**
 * Parses pagination parameters from the request query.
 *
 * Copied from the official Neo4j Graphacademy repo: https://github.com/neo4j-graphacademy/app-nodejs/blob/main/src/utils.js
 * and modiefied.
 *
 * @param {Request} req - The express request object.
 * @returns {Record<string, any>} An object with the following properties:
 *   - `search`: The search string to filter by.
 *   - `sort`: The field to sort by.
 *   - `order`: The direction of the sort (ascending/descending).
 *   - `limit`: The maximum number of results to return.
 *   - `skip`: The number of results to skip.
 */
export function getPagination(req: Request): Record<string, any> {
  // TODO: Should this function have more restriction functionalities/error handling
  let { search, limit, skip, sort, order } = req.query;

  // Valid Order directions
  const ORDER_ASC: string = 'ASC';
  const ORDER_DESC: string = 'DESC';
  const ORDERS: string[] = [ORDER_ASC, ORDER_DESC];

  // Set default values
  sort ||= 'label';
  search ||= '';

  // Only accept ASC/DESC values
  if (!order || !ORDERS.includes(order.toString().toUpperCase())) {
    order = ORDER_ASC;
  }

  return {
    search,
    sort,
    order,
    limit: parseInt(limit as string) || 100,
    skip: parseInt(skip as string) || 0,
  };
}

/**
 * Convert Neo4j Properties back into JavaScript types.
 *
 * Copied from the official Neo4j Graphacademy repo: https://github.com/neo4j-graphacademy/app-nodejs/blob/main/src/utils.js
 * and modiefied.
 *
 * @param {Record<string, any>} properties
 * @return {Record<string, any>}
 */
export function toNativeTypes(properties: any) {
  return Object.fromEntries(
    Object.keys(properties).map(key => {
      let value = valueToNativeType(properties[key]);

      return [key, value];
    }),
  );
}

/**
 * Convert an individual value to its JavaScript equivalent.
 *
 * Copied from the official Neo4j Graphacademy repo: https://github.com/neo4j-graphacademy/app-nodejs/blob/main/src/utils.js
 * and modiefied.
 *
 * @param {any} value
 * @returns {any}
 */
function valueToNativeType(value: any) {
  if (Array.isArray(value)) {
    value = value.map(innerValue => valueToNativeType(innerValue));
  } else if (isInt(value)) {
    value = value.toNumber();
  } else if (isDate(value) || isDateTime(value) || isLocalDateTime(value)) {
    value = value.toStandardDate();
  } else if (isLocalTime(value) || isTime(value)) {
    value = value.toString();
  } else if (isDuration(value)) {
    value = value.toString();
  } else if (typeof value === 'object' && value !== undefined && value !== null) {
    value = toNativeTypes(value);
  }

  return value;
}

/**
 * Convert JavaScript types back into Neo4j Properties, using the provided configuration.
 *
 * @param {Record<string, any>} properties
 * @param {PropertyConfig[]} fields
 * @return {Record<string, any>}
 */
export function toNeo4jTypes(properties: any, fields: PropertyConfig[]): Record<string, any> {
  return Object.fromEntries(
    Object.keys(properties).map(key => {
      const config: PropertyConfig | undefined = fields.find(field => field.name === key);
      const value: any = valueToNeo4jType(properties[key], config);

      return [key, value];
    }),
  );
}

/**
 * Convert an individual value to its Neo4j equivalent, using the provided configuration.
 *
 * @param {any} value
 * @param {PropertyConfig | undefined} fieldConfig
 * @returns {any}
 */
function valueToNeo4jType(value: any, config: Partial<PropertyConfig> | undefined): any {
  // TODO: This is the case for non-customizable properties (uuid, start/endIndex etc.). Keep or handle better?
  if (!config) {
    return value;
  }

  // Call function recursively if data type is array
  if (Array.isArray(value) && config.type === 'array') {
    return value.map(innerValue => valueToNeo4jType(innerValue, config));
  }

  if (config.type === 'integer') {
    // if (typeof value === 'number' && Number.isInteger(value)) {
    //   return int(value);
    // }
    return types.Integer.fromValue(value);
  } else if (config.type === 'number') {
    return value;
  } else if (config.type === 'string') {
    return value;
  } else if (config.type === 'date') {
    return types.Date.fromStandardDate(new Date(value));
  } else if (config.type === 'date-time') {
    return types.DateTime.fromStandardDate(new Date(value));
  } else if (config.type === 'time') {
    return types.LocalTime.fromStandardDate(new Date(value));
  } else if (config.type === 'boolean') {
    return value;
  } else if (config.type === 'array') {
    //Already handled in the beginning of the function
    return value;
  } else {
    return value;
  }
}
