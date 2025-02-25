import { ref } from 'vue';
import { IGuidelines } from '../models/IGuidelines';
import { useFilterStore } from './filter';
import { AnnotationProperty, AnnotationType, CollectionProperty } from '../models/types';

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
   * @return {AnnotationProperty[]} The fields for the annotation type.
   */
  function getAnnotationFields(type: string): AnnotationProperty[] {
    return [
      ...(getAnnotationConfig(type)?.properties ?? []),
      ...guidelines.value.annotations.properties,
    ];
  }

  /**
   * Retrieves the available labels that can be assigned to a no Text node.
   *
   * @return {string[]} The available labels.
   */
  function getAvailableTextLabels(): string[] {
    console.log(guidelines.value);
    return guidelines.value.texts.additionalLabels;
  }

  /**
   * Retrieves field configuration of a collection of given type. Contains information about rendering behaviour as well as validation rules.
   * Used for rendering data tables or input fields in forms.
   *
   * @param {string} type - The type of the collection.
   * @return {CollectionProperty[]} The field configurations for the collection type.
   */
  function getCollectionFields(type: string): CollectionProperty[] {
    return guidelines.value?.collections.find(c => c.type === type)?.properties ?? [];
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
    getAnnotationConfig,
    getAnnotationFields,
    getAvailableTextLabels,
    getCollectionFields,
    initializeGuidelines,
  };
}
