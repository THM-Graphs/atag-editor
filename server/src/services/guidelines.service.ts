import { IGuidelines } from '../models/IGuidelines.js';
import { CollectionProperty } from '../models/types.js';
import NotFoundError from '../errors/not-found.error.js';

export default class GuidelinesService {
  /**
   * Retrieves field configuration of a collection with given additional node labels. Contains information about validation rules (required/not required).
   * Used for applying default data to to-be-created collections when they are missing
   *
   * @param {string[]} nodeLabels - The additional labels of the collection.
   * @return {Promise<CollectionProperty[]>} The field configurations for the collection type.
   */
  public async getCollectionConfigFields(nodeLabels: string[]): Promise<CollectionProperty[]> {
    const guidelines: IGuidelines = await this.getGuidelines();

    const system: CollectionProperty[] = guidelines.collections.properties.system;
    const base: CollectionProperty[] = guidelines.collections.properties.base;
    const additional: CollectionProperty[] = guidelines.collections.types.reduce(
      (total: CollectionProperty[], curr) => {
        if (nodeLabels.includes(curr.additionalLabel)) {
          total.push(...curr.properties);
        }
        return total;
      },
      [],
    );

    return [...system, ...base, ...additional];
  }

  /**
   * Retrieves the guidelines from the URL defined in the GUIDELINES_URL environment variable.
   *
   * @throws {NotFoundError} If the URL is not provided or if the guidelines could not be loaded.
   * @return {Promise<IGuidelines>} The retrieved guidelines.
   */
  public async getGuidelines(): Promise<IGuidelines> {
    // TODO: Improve error handling...
    const url: string | undefined = process.env.GUIDELINES_URL;

    if (!url) {
      throw new NotFoundError(`URL to guidelines is not provided...`);
    }

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new NotFoundError(`Guidelines could not be loaded`);
    }

    const guidelines: IGuidelines = await response.json();

    return guidelines;
  }
}
