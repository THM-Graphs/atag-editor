import { IGuidelines } from '../models/IGuidelines.js';
import { AnnotationConfigResource, AnnotationType, PropertyConfig } from '../models/types.js';
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
    const system: PropertyConfig[] = guidelines.annotations.properties.system;
    const base: PropertyConfig[] = guidelines.annotations.properties.base;
    const additional: PropertyConfig[] =
      guidelines.annotations.types.find(annoConfig => annoConfig.type === type)?.properties ?? [];

    return [...system, ...base, ...additional];
  }

  /**
   * Retrieves all available resource configurations for annotations from the guidelines.
   *
   * This method combines the resources defined in the annotations and collections sections
   * of the guidelines and removes any duplicates. It is currently a hack since the guidelines structure can change.
   *
   * @return {Promise<AnnotationConfigResource[]>} A promise that resolves to the combined and deduplicated resources.
   */
  public async getAvailableAnnotationResourceConfigs(): Promise<AnnotationConfigResource[]> {
    const guidelines: IGuidelines = await this.getGuidelines();

    const baseAnnotationResources: AnnotationConfigResource[] =
      guidelines.annotations.resources ?? [];

    const baseCollectionResources: AnnotationConfigResource[] =
      guidelines.collections.annotations.resources ?? [];

    const additionalCollectionResources: AnnotationConfigResource[] =
      guidelines.collections.types.flatMap(c => c.annotations?.resources ?? []);

    const combined: AnnotationConfigResource[] = [
      ...baseAnnotationResources,
      ...baseCollectionResources,
      ...additionalCollectionResources,
    ];

    const unique: AnnotationConfigResource[] = combined.reduce<AnnotationConfigResource[]>(
      (total, curr) => {
        if (!total.some(r => r.category === curr.category && r.nodeLabel === curr.nodeLabel)) {
          total.push(curr);
        }
        return total;
      },
      [],
    );

    return unique;
  }

  /**
   * Retrieves all available annotation types for a collection with given node labels from the guidelines.
   *
   * The method operates on the given guidelines parameter instead of fetching from within. This is done
   * to prevent multiple requests when the method is called inside a loop.
   *
   * @param {IGuidelines} guidelines - The guidelines to retrieve the annotation types from.
   * @param {string[]} collectionNodeLabels - The node labels of the collection.
   * @return {AnnotationType[]} The combined and deduplicated annotation types.
   */
  public getAvailableCollectionAnnotationConfigsFromGuidelines(
    guidelines: IGuidelines,
    collectionNodeLabels: string[],
  ): AnnotationType[] {
    const base: AnnotationType[] = guidelines.collections.annotations.types;
    const additional: AnnotationType[] = guidelines.collections.types.reduce(
      (total: AnnotationType[], curr) => {
        if (collectionNodeLabels.includes(curr.additionalLabel)) {
          const nested: AnnotationType[] = curr.annotations?.types ?? [];
          total.push(...nested);
        }
        return total;
      },
      [],
    );

    return [...base, ...additional];
  }

  /**
   * Retrieves the properties an annotation of given type should have in the context of a Collection with given node labels.
   * Used for rendering input fields in forms where properties of the annotation can be edited. Currently a hack.
   *
   * The method operates on the given guidelines parameter instead of fetching from within. This is done
   * to prevent multiple requests when the method is called inside a loop.
   *
   * @param {string[]} collectionNodeLabels - The node labels of the Collection.
   * @param {string} annotationType - The type of the annotation.
   * @return {PropertyConfig[]} The fields for the annotation type in the context of the Collection.
   */
  public getCollectionAnnotationFieldsFromGuidelines(
    guidelines: IGuidelines,
    collectionNodeLabels: string[],
    annotationType: string,
  ): PropertyConfig[] {
    // TODO: This is a hack since the guidelines structure can change. It should be refactored to use the same structure as the annotations.

    // Default properties for annotations that are in ALL collections
    const byDefault: PropertyConfig[] = [
      ...(guidelines.collections.annotations?.properties.system ?? []),
      ...(guidelines.collections.annotations?.properties.base ?? []),
    ];

    // Default properties for annotations that exists in the collections with given node labels
    const byCollectionType: PropertyConfig[] = guidelines.collections.types.reduce(
      (total: PropertyConfig[], curr) => {
        if (collectionNodeLabels.includes(curr.additionalLabel)) {
          const nested: PropertyConfig[] = curr.annotations?.properties ?? [];

          total.push(...nested);
        }

        return total;
      },
      [],
    );

    // Properties for the given annotation type (no matter which level)
    const byAnnotationType: PropertyConfig[] =
      this.getAvailableCollectionAnnotationConfigsFromGuidelines(
        guidelines,
        collectionNodeLabels,
      ).find(t => t.type === annotationType)?.properties ?? [];

    return [...byDefault, ...byCollectionType, ...byAnnotationType];
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
