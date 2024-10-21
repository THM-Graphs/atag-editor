import neo4j, { Config, Driver, QueryResult, ServerInfo, Session } from 'neo4j-driver';

export default class Neo4jDriver {
  public static instance: Driver;

  /**
   * Initializes the driver by creating a connection to the Neo4j database.
   *
   * @return {Promise<Driver>} A promise that resolves to the Neo4j driver instance.
   */
  public static async createDatabaseConnection(): Promise<Driver> {
    const uri: string = `${process.env.NEO4J_URI}`;
    const user: string = `${process.env.NEO4J_USER}`;
    const password: string = `${process.env.NEO4J_PW}`;

    const developmentConfig: Config = {
      disableLosslessIntegers: true,
    };

    const deploymentConfig: Config = {
      ...developmentConfig,
      encrypted: 'ENCRYPTION_ON',
      trust: 'TRUST_CUSTOM_CA_SIGNED_CERTIFICATES',
      trustedCertificates: ['/app/certificates/public.crt'],
    };

    let options: Config =
      process.env.NODE_ENV === 'production' ? deploymentConfig : developmentConfig;

    try {
      this.instance = neo4j.driver(uri, neo4j.auth.basic(user, password));

      const serverInfo: ServerInfo = await this.instance.getServerInfo();
      console.log(`Connection established: ${serverInfo}`);
    } catch (err: unknown) {
      console.log(`Connection error\n${err}\nCause: ${err}`);
    }

    return this.instance;
  }

  /**
   * Runs a query using the provided parameters and returns the result.
   *
   * @param {string} query The query to run.
   * @param {...any[]} params The parameters to pass to the query.
   * @return {Promise<QueryResult>} A promise that resolves to the query result.
   */
  public static async runQuery(query: string, ...params: any[]): Promise<QueryResult> {
    const session: Session = this.instance.session();
    // TODO: This should ideally be split up in "exectuteWrite" and "executeRead"
    const result: QueryResult = await session.executeWrite(tx => {
      return tx.run(query, ...params);
    });
    await session.close();
    return result;
  }
}
