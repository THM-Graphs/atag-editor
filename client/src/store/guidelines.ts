import { ref } from 'vue';
import { IGuidelines } from '../models/IGuidelines';
import { useFilterStore } from './filter';
import { AnnotationType, PropertyConfig } from '../models/types';

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
    getAvailableCollectionLabels,
    getAvailableTextLabels,
    getCollectionConfigFields,
    initializeGuidelines,
  };
}
