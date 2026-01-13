import neo4j, { Driver, Neo4jError, QueryResult, ServerInfo, Session } from 'neo4j-driver';
import DatabaseConnectionError from '../errors/database-connection.error.js';
import InternalServerError from '../errors/server.error.js';

export default class Neo4jDriver {
  public static instance: Driver;

  /**
   * Checks the health of the database connection and returns a ServerInfo object if healthy.
   * Throws a DatabaseConnectionError if the API returns an error.
   *
   * @returns {Promise<ServerInfo | undefined>} A promise that resolves to the server information if the connection is healthy, or undefined if the connection is unhealthy.
   * @throws {DatabaseConnectionError} If the database connection is unhealthy.
   */
  public static async checkDatabaseConnection(): Promise<ServerInfo | undefined> {
    try {
      const serverInfo: ServerInfo = await this.instance.getServerInfo();

      return serverInfo;
    } catch (err: unknown) {
      this.handleNeo4jError(err);
    }
  }

  /**
   * Initializes the driver by creating a connection to the Neo4j database.
   *
   * @return {Promise<Driver>} A promise that resolves to the Neo4j driver instance.
   */
  public static async createDatabaseConnection(): Promise<Driver> {
    const uri: string = `${process.env.NEO4J_URI}`;
    const user: string = `${process.env.NEO4J_USER}`;
    const password: string = `${process.env.NEO4J_PW}`;

    try {
      this.instance = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        disableLosslessIntegers: true,
      });

      const serverInfo: ServerInfo | undefined = await this.checkDatabaseConnection();
      console.log(`Connection established: ${serverInfo}`);
    } catch (err: unknown) {
      console.log(`Connection error\n${err}\nCause: ${err}`);
    }

    return this.instance;
  }

  /**
   * Handles Neo4j errors by throwing more specific errors.
   *
   * @returns {void} This function does not return any value.
   * @throws {AppError} - An App Error (either the original or a subclass of it).
   */
  private static handleNeo4jError(err: unknown): void {
    // Fallback error throwing
    if (!(err instanceof Neo4jError)) {
      throw new InternalServerError('An error occurred while connecting to the database.');
    }

    // More errors could be added, but this is enough for now
    if (err.code === 'ServiceUnavailable') {
      throw new DatabaseConnectionError('Unable to connect to the database.');
    } else {
      throw new InternalServerError('An error occurred while connecting to the database.');
    }
  }

  /**
   * Runs a query using the provided parameters and returns the result.
   *
   * @param {string} query The query to run.
   * @param {...any[]} params The parameters to pass to the query.
   * @return {Promise<QueryResult>} A promise that resolves to the query result.
   */
  public static async runQuery(query: string, ...params: any[]): Promise<any> {
    try {
      const session: Session = this.instance.session({
        database: process.env.DATABASE_NAME ?? 'neo4j',
      });

      // TODO: This should ideally be split up in "exectuteWrite" and "executeRead"
      const result: QueryResult = await session.executeWrite(tx => {
        return tx.run(query, ...params);
      });

      await session.close();

      return result;
    } catch (err: unknown) {
      this.handleNeo4jError(err);
    }
  }
}
