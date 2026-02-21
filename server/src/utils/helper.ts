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
import { CursorData, PropertyConfig } from '../models/types.js';
import ICharacter from '../models/ICharacter.js';

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
 * Creates an array of Character nodes from a given string.
 *
 * Used for preprocessing texts that came attached to Annotations or Collections and have to be created
 * from scratch in the database.
 *
 * @param {string} text - The string to create characters from.
 * @return {ICharacter[]} An array of ICharacter objects, one for each character in the input string.
 */
export function createCharactersFromText(text: string): ICharacter[] {
  return text.split('').map((c: string) => ({
    text: c,
    uuid: crypto.randomUUID(),
  }));
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
  let { search, limit, order, cursorUuid, cursorLabel } = req.query;

  // Valid Order directions
  const ORDER_ASC: string = 'ASC';
  const ORDER_DESC: string = 'DESC';
  const ORDERS: string[] = [ORDER_ASC, ORDER_DESC];
  // TODO: This is a temporary solution until a better endless
  // pagination solution in the frontend is implemented
  const MAX_ROW_COUNT: number = 1000;
  const isCursorValid: boolean =
    typeof cursorUuid === 'string' && typeof cursorLabel === 'string' && cursorUuid !== '';

  // Set default values
  search ||= '';
  const cursor: CursorData | null = isCursorValid
    ? {
        uuid: cursorUuid as string,
        label: cursorLabel as string,
      }
    : null;

  // Only accept ASC/DESC values
  if (!order || !ORDERS.includes(order.toString().toUpperCase())) {
    order = ORDER_ASC;
  }

  return {
    cursor,
    limit: parseInt(limit as string) || MAX_ROW_COUNT,
    order,
    search,
  };
}

/**
 * Checks if a given file name is a valid configuration file.
 *
 * Currently used to validate the provided file name for guidelines and stylesheet when the provided URL
 * is not a valid HTTP URL, to prevent path traversal and only allow JSON and CSS files in the config directory.
 *
 * @param {string} fileName The file name (maybe including a path) to check.
 * @return {boolean} True if the file name is a valid configuration file, false otherwise.
 */
export function isValidConfigFile(fileName: string): boolean {
  // No path traversal should be allowed, only the file name
  if (fileName.includes('/') || fileName.includes('..')) {
    return false;
  }

  // Files in the directry are either JSON (guidelines) or CSS (stylesheet) files, so only these should be allowed
  if (!fileName.endsWith('.json') && !fileName.endsWith('.css')) {
    return false;
  }

  return true;
}

/**
 * Checks if a given string is a valid HTTP URL.
 *
 * Currently only used to determine whether the provided URLs for
 * guidelines and styles are a remote URL that needs to be fetched
 * or a local file path that can be read from the file system directly.
 *
 * @param {string} string The string to check.
 * @return {boolean} True if the string is a valid HTTP URL, false otherwise.
 */
export function isValidHttpUrl(string: string): boolean {
  try {
    const newUrl: URL = new URL(string);

    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch (err: unknown) {
    return false;
  }
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
export function toNativeTypes(properties: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.keys(properties).map(key => {
      const value: any = valueToNativeType(properties[key]);

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
function valueToNativeType(value: any): any {
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
 * Convert JavaScript types back into Neo4j Properties, using the provided configuration. This conversion direction
 * uses the field configuration since the desired neo4j data type can not always be inferred from the JavaScript type
 * (e.g. dates, date times and times are always strings in JavaScript).
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
 * Convert an individual value to its Neo4j equivalent, using the provided configuration. This conversion direction
 * uses the field configuration since the desired neo4j data type can not always be inferred from the JavaScript type
 * (e.g. dates, date times and times are always strings in JavaScript).
 *
 * @param {any} value
 * @param {PropertyConfig | undefined} config
 * @returns {any}
 */
function valueToNeo4jType(value: any, config: Partial<PropertyConfig> | undefined): any {
  // TODO: How handle empty string?
  // TODO: This is the case for non-customizable properties (uuid, start/endIndex etc.). Keep or handle better?
  if (!config) {
    return value;
  }

  const isRequired: boolean = config?.required ?? true;
  const valueIsNull: boolean = value === null || value === undefined;

  // This can be applied to all data types - if the value does not exist and is not needed, it doesnt need to be set
  if (valueIsNull && !isRequired) {
    return null;
  }

  // Call function recursively when needed if data type is array
  if (config.type === 'array') {
    if (value.length === 0) {
      if (isRequired) {
        return [];
      } else {
        return null;
      }
    } else {
      return (
        value
          .map((innerValue: any) => valueToNeo4jType(innerValue, config.items))
          // This is needed since arrays with null values (e.g. [1, 2, null, 4]) are not allowed as node properties)
          .filter((v: any) => v !== null && v !== undefined)
      );
    }
  }

  if (config.type === 'integer') {
    if (valueIsNull) {
      if (!isRequired) {
        return null;
      } else {
        return 0;
      }
    } else {
      return types.Integer.fromValue(value);
    }
  } else if (config.type === 'number') {
    return value;
  } else if (config.type === 'string') {
    return value;
  } else if (config.type === 'date') {
    if (valueIsNull && !isRequired) {
      return null;
    } else {
      return types.Date.fromStandardDate(new Date(value));
    }
  } else if (config.type === 'date-time') {
    if (valueIsNull && !isRequired) {
      return null;
    } else {
      return types.DateTime.fromStandardDate(new Date(value));
    }
  } else if (config.type === 'time') {
    if (valueIsNull) {
      if (!isRequired) {
        return null;
      } else {
        return new types.LocalTime(0, 0, 0, 0);
      }
    } else {
      // Needs more work since parsing can fail easily (Dates/Datetimes handle wrong values better)
      try {
        const items: number[] = (value as string).split(':').map((item: string) => {
          const parsed: number = parseInt(item);

          if (isNaN(parsed)) {
            throw new Error(`Invalid time format: ${value}`);
          }

          return parsed;
        });

        const hours: number = items[0] ?? 0;
        const minutes: number = items[1] ?? 0;
        const seconds: number = items[2] ?? 0;

        return new types.LocalTime(hours, minutes, seconds, 0);
      } catch (e: unknown) {
        console.error(`Failed to parse time from value "${value}":`, e);

        // Same logic as above (no value/not required)
        if (!isRequired) {
          return null;
        }

        return new types.LocalTime(0, 0, 0, 0);
      }
    }
  } else if (config.type === 'boolean') {
    return value;
  } else {
    return value;
  }
}
