import { IGuidelines } from '../models/IGuidelines.js';
import { PropertyConfig } from '../models/types.js';
import NotFoundError from '../errors/not-found.error.js';

export default class GuidelinesService {
  /**
   * Retrieves the field configuration of an annotation with the given type.
   *
   * The method operates on the given guidelines parameter instead of fetching from within. This is done
   * to prevent multiple requests, since the method is used to preprocess a batch of annotations before
   * saving them.
   *
   * @param {IGuidelines} guidelines - The guidelines to retrieve the field configuration from.
   * @param {string} type - The type of the annotation.
   * @return {PropertyConfig[]} The field configuration for the annotation type.
   */
  public getAnnotationConfigFieldsFromGuidelines(
    guidelines: IGuidelines,
    type: string,
  ): PropertyConfig[] {
    // TODO: This is preliminary, since annotations do not have the system/base/additional categories yet
    const system: PropertyConfig[] = [];
    const base: PropertyConfig[] = guidelines.annotations.properties;
    const additional: PropertyConfig[] =
      guidelines.annotations.types.find(annoConfig => annoConfig.type === type)?.properties ?? [];

    return [...system, ...base, ...additional];
  }

  /**
   * Retrieves the field configuration of a collection with the given additional node labels.
   *
   * The method operates on the given guidelines parameter instead of fetching from within. This is done
   * to prevent multiple requests, since the method is used to preprocess a batch of collections before
   * saving them.
   *
   * @param {IGuidelines} guidelines - The guidelines to retrieve the field configuration from.
   * @param {string[]} nodeLabels - The additional labels of the collection.
   * @return {PropertyConfig[]} The field configuration for the collection type.
   */
  public getCollectionConfigFieldsFromGuidelines(
    guidelines: IGuidelines,
    nodeLabels: string[],
  ): PropertyConfig[] {
    const system: PropertyConfig[] = guidelines.collections.properties.system;
    const base: PropertyConfig[] = guidelines.collections.properties.base;
    const additional: PropertyConfig[] = guidelines.collections.types.reduce(
      (total: PropertyConfig[], curr) => {
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
   * Retrieves field configuration of a collection with given additional node labels.
   * Contains information about validation rules (required/not required).
   * Used for applying default data to to-be-created collections when they are missing
   *
   * The method fetches the guidelines from the guidelines URL defined in the GUIDELINES_URL environment variable
   * since it will not be called multiple times in the same context (like `getCollectionConfigFieldsFromGuidelines` or `getAnnotationConfigFieldsFromGuidelines`)
   *
   * @param {string[]} nodeLabels - The additional labels of the collection.
   * @return {Promise<PropertyConfig[]>} The field configurations for the collection type.
   */
  public async getCollectionConfigFields(nodeLabels: string[]): Promise<PropertyConfig[]> {
    const guidelines: IGuidelines = await this.getGuidelines();

    const system: PropertyConfig[] = guidelines.collections.properties.system;
    const base: PropertyConfig[] = guidelines.collections.properties.base;
    const additional: PropertyConfig[] = guidelines.collections.types.reduce(
      (total: PropertyConfig[], curr) => {
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
