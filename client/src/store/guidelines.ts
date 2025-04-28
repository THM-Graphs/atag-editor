import { ref } from 'vue';
import { IGuidelines } from '../models/IGuidelines';
import { useFilterStore } from './filter';
import { AnnotationConfigResource, AnnotationType, PropertyConfig } from '../models/types';

const guidelines = ref<IGuidelines>();
const groupedAnnotationTypes = ref<Record<string, AnnotationType[]>>();
const { initializeFilter } = useFilterStore();

/**
 * Store for making the edition guidelines available to all components. When the component is mounted,
 * the store is initialized with the fetched guidelines. The store is static, meaning that no properties are changed
 * after the initialization. Other stores (filter.ts) are derived from this store.
 */
export function useGuidelinesStore() {
  /**
   * Initializes the store with the provided data and initializes the filter store.
   *
   * @param {IGuidelines} guidelinesData - The guidelines data to initialize with.
   * @return {void} This function does not return anything.
   */
  function initializeGuidelines(guidelinesData: IGuidelines): void {
    guidelines.value = guidelinesData;
    groupedAnnotationTypes.value = groupAnnotationTypes();

    initializeFilter(guidelines.value);
  }

  /**
   * Retrieves the configuration for an annotation of given type. The configuration is an object containing internal information
   * as well as information about rendering behaviour (input type in forms, selection status etc.).
   *
   * @param {string} type - The type of the annotation.
   * @return {AnnotationType} The configuration of the annotation type.
   */
  function getAnnotationConfig(type: string): AnnotationType {
    return guidelines.value.annotations.types.find(t => t.type === type);
  }

  /**
   * Retrieves the properties an annotation of given type should should have. Used for rendering input fields in forms
   * where properties of the annotation can be edited. The fields are retrieved from the annotation type itself (if it has any)
   * and from the global annotation properties.
   *
   * @param {string} type - The type of the annotation.
   * @return {PropertyConfig[]} The fields for the annotation type.
   */
  function getAnnotationFields(type: string): PropertyConfig[] {
    const system: PropertyConfig[] = guidelines.value.annotations.properties.system;
    const base: PropertyConfig[] = guidelines.value.annotations.properties.base;
    const additional: PropertyConfig[] = getAnnotationConfig(type)?.properties ?? [];

    return [...system, ...base, ...additional];
  }

  /**
   * Retrieves the properties an annotation of given type should have in the context of a Collection with given node labels.
   * Used for rendering input fields in forms where properties of the annotation can be edited. Currently a hack.
   *
   * @param {string[]} collectionNodeLabels - The node labels of the Collection.
   * @param {string} annotationType - The type of the annotation.
   * @return {PropertyConfig[]} The fields for the annotation type in the context of the Collection.
   */
  function getCollectionAnnotationFields(
    collectionNodeLabels: string[],
    annotationType: string,
  ): PropertyConfig[] {
    // TODO: This is a hack since the guidelines structure can change. It should be refactored to use the same structure as the annotations.

    // Default properties for annotations that are in ALL collections
    const byDefault: PropertyConfig[] = [
      ...(guidelines.value.collections.annotations?.properties.system ?? []),
      ...(guidelines.value.collections.annotations?.properties.base ?? []),
    ];

    // Default properties for annotations that exists in the collections with given node labels
    const byCollectionType: PropertyConfig[] = guidelines.value.collections.types.reduce(
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
      getAvailableCollectionAnnotationTypes(collectionNodeLabels).find(
        t => t.type === annotationType,
      )?.properties ?? [];

    return [...byDefault, ...byCollectionType, ...byAnnotationType];
  }

  // TODO: This is a hack since the guidelines structure can change. It should be refactored to use the same structure as the annotations.
  function getCollectionAnnotationConfig(
    collectionLabels: string[],
    annotationType: string,
  ): AnnotationType {
    const base: AnnotationType[] = guidelines.value?.collections.annotations?.types ?? [];

    const nested: AnnotationType[] = guidelines.value?.collections.types.flatMap(
      t => t.annotations?.types ?? [],
    );

    // console.log(base);
    // console.log(nested);
    // debugger;

    const desired: AnnotationType = [...base, ...nested].find(t => t.type === annotationType);

    return desired;
  }

  /**
   * Retrieves all available resource configurations for annotations from the guidelines.
   *
   * This method combines the resources defined in the annotations and collections sections
   * of the guidelines and removes any duplicates. It is currently a hack since the guidelines structure can change.
   *
   * @return {AnnotationConfigResource[]} The combined and deduplicated resources.
   */
  function getAvailableAnnotationResourceConfigs(): AnnotationConfigResource[] {
    const baseAnnotationResources: AnnotationConfigResource[] =
      guidelines.value.annotations.resources ?? [];

    const baseCollectionResources: AnnotationConfigResource[] =
      guidelines.value.collections.annotations.resources ?? [];

    const additionalCollectionResources: AnnotationConfigResource[] =
      guidelines.value.collections.types.flatMap(c => c.annotations?.resources ?? []);

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

  function getAvailableCollectionAnnotationTypes(collectionNodeLabels: string[]): AnnotationType[] {
    const base: AnnotationType[] = guidelines.value.collections.annotations.types;
    const additional: AnnotationType[] = guidelines.value.collections.types.reduce(
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
   * Retrieves the available labels that can be assigned to a Collection node.
   *
   * @return {string[]} The available labels.
   */
  function getAvailableCollectionLabels(): string[] {
    return guidelines.value?.collections.types.map(collection => collection.additionalLabel) ?? [];
  }

  /**
   * Retrieves the available labels that can be assigned to a no Text node.
   *
   * @return {string[]} The available labels.
   */
  function getAvailableTextLabels(): string[] {
    return guidelines.value.texts.additionalLabels;
  }

  /**
   * Retrieves field configuration of a collection with given additional node labels. Contains information about rendering behaviour as well as validation rules.
   * Used for rendering data tables or input fields in forms.
   *
   * @param {string[]} nodeLabels - The additional labels of the collection.
   * @return {PropertyConfig[]} The field configurations for the collection type.
   */
  function getCollectionConfigFields(nodeLabels: string[]): PropertyConfig[] {
    const system: PropertyConfig[] = guidelines?.value.collections.properties.system;
    const base: PropertyConfig[] = guidelines?.value.collections.properties.base;
    const additional: PropertyConfig[] = guidelines?.value.collections.types.reduce(
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
   * Retrieves all available field configurations for collection properties.
   *
   * This method gathers all available collection labels and fetches their corresponding
   * field configurations, which are used for rendering data tables or input fields in forms.
   *
   * @return {PropertyConfig[]} The field configurations for all available collection types.
   */
  function getAllCollectionConfigFields(): PropertyConfig[] {
    const availableCollectionLabels: string[] = getAvailableCollectionLabels();

    return getCollectionConfigFields(availableCollectionLabels);
  }

  /**
   * Groups the annotation types by category.
   *
   * @return {Record<string, AnnotationType[]>} An object where the keys are the categories and the values are arrays of annotation types belonging to that category.
   */
  function groupAnnotationTypes(): Record<string, AnnotationType[]> {
    return guidelines.value.annotations.types.reduce(
      (grouped: Record<string, AnnotationType[]>, current: AnnotationType) => {
        const category = current.category;

        if (!grouped[category]) {
          grouped[category] = [];
        }

        grouped[category].push(current);

        return grouped;
      },
      {},
    );
  }

  return {
    groupedAnnotationTypes,
    guidelines,
    getAllCollectionConfigFields,
    getAnnotationConfig,
    getAnnotationFields,
    getAvailableAnnotationResourceConfigs,
    getAvailableCollectionAnnotationTypes,
    getAvailableCollectionLabels,
    getAvailableTextLabels,
    getCollectionAnnotationFields,
    getCollectionAnnotationConfig,
    getCollectionConfigFields,
    initializeGuidelines,
  };
}
