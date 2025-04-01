import { Request } from 'express';
import {
  isDate,
  isDateTime,
  isDuration,
  isInt,
  isLocalDateTime,
  isLocalTime,
  isTime,
} from 'neo4j-driver';

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
    // Nanoseconds are omitted since JS Dates can not handled them and they are not really needed
    const { hour, minute, second } = value;
    const baseDate: Date = new Date(1970, 0, 1);

    console.log(isInt(hour) ? 'integer' : 'something else');
    console.log(isInt(minute) ? 'integer' : 'something else');
    console.log(isInt(second) ? 'integer' : 'something else');

    // Add the time components to the new Date object (Convert if necessary)
    baseDate.setHours(isInt(hour) ? hour.toNumber() : hour);
    baseDate.setMinutes(isInt(minute) ? minute.toNumber() : minute);
    baseDate.setSeconds(isInt(second) ? second.toNumber() : second);

    value = baseDate.toISOString();
  } else if (isDuration(value)) {
    value = value.toString();
  } else if (typeof value === 'object' && value !== undefined && value !== null) {
    value = toNativeTypes(value);
  }

  return value;
}
