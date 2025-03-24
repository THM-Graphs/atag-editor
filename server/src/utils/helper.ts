import { Request } from 'express';

/**
 * Capitalizes the first letter of a given string.
 *
 * @param {string} inputString - The string to be capitalized.
 * @return {string} The input string with the first letter capitalized.
 */
export function capitalize(inputString: string): string {
  return inputString.charAt(0).toUpperCase() + inputString.slice(1);
}

// Valid Order directions
const ORDER_ASC: string = 'ASC';
const ORDER_DESC: string = 'DESC';
const ORDERS: string[] = [ORDER_ASC, ORDER_DESC];

// export const MOVIE_SORT: string[] = ['title', 'released', 'imdbRating'];
// export const PEOPLE_SORT: string[] = ['name', 'born', 'movieCount'];
// export const RATING_SORT: string[] = ['rating', 'timestamp'];

/**
 * Extract commonly used pagination variables from the request query string.
 *
 * Copied from the official Neo4j Graphacademy repo: https://github.com/neo4j-graphacademy/app-nodejs/blob/main/src/routes/movies.routes.js
 *
 * @param {Request} req - The request object.
 * @returns {Record<string, any>}
 */
export function getPagination(req: Request): Record<string, any> {
  // TODO: Fix types
  // TODO: Fix JSDoc
  let { search, limit, skip, sort, order } = req.query;

  // Only accept valid orderby fields
  if (!sort) {
    // TODO: Move to constant?
    sort = 'label';
  }

  if (!search) {
    search = '';
  }

  // Only accept ASC/DESC values
  if (order === undefined || !ORDERS.includes(order.toString().toUpperCase())) {
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
