import { computed, readonly, ref } from 'vue';
import { IGuidelines } from '../models/IGuidelines';
import { useFilterStore } from './filter';
import { AnnotationConfigEntity, AnnotationType, PropertyConfig } from '../models/types';
import { Extension } from '@tiptap/vue-3';
import Heading from '@tiptap/extension-heading';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import UniqueID from '@tiptap/extension-unique-id';
import { Bold } from '@tiptap/extension-bold';
import { TextAlign } from './TextAlign';
import { LineHeight } from './LineHeight';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customHeading: {
      toggleCustomHeading: () => ReturnType;
    };
  }
}

const guidelines = ref<IGuidelines>();
const isFetching = ref<boolean>(false);
const error = ref<any>(null);
const isInitialized = computed<boolean>(() => guidelines.value && !isFetching.value);

const groupedAnnotationTypes = ref<Record<string, AnnotationType[]>>();
const availableCollectionLabels = ref<string[]>([]);
const groupedAndSortedAnnotationTypes = ref<Record<string, AnnotationType[]>>();
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
    groupedAndSortedAnnotationTypes.value = sortAnnotationTypesInGroup();
    availableCollectionLabels.value = getAvailableCollectionLabels();

    initializeFilter(guidelines.value);
  }

  /**
   * Checks if an annotation type has constraints such as required properties, entities etc.
   *
   * Currently used for when the user clicks on an annotation button to enforce constraints.
   *
   * @param {AnnotationType} config The annotation type to check.
   * @returns {boolean} True if the annotation type has constraints.
   */
  function annotationHasConstraints(config: AnnotationType): boolean {
    // TODO: The subType field requires a lot of hacks -> Refactor later
    if (config.properties?.some(p => p.required === true && p.name !== 'subType')) {
      return true;
    }

    if (config.hasEntities === true) {
      return true;
    }

    return false;
  }

  /**
   * Retrieves the configuration for an annotation of given type. The configuration is an object containing internal information
   * as well as information about rendering behaviour (input type in forms, selection status etc.).
   *
   * This function is only used for Text annotations, not Collections annotations.
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
   * This function is only used for Text annotations, not Collections annotations.
   *
   * @param {string} type - The type of the annotation.
   * @return {PropertyConfig[]} The fields for the annotation type.
   */
  function getAnnotationFields(type: string): PropertyConfig[] {
    const system: PropertyConfig[] = guidelines.value.annotations.properties.system;
    const base: PropertyConfig[] = guidelines.value.annotations.properties.base;
    const additional: PropertyConfig[] = getAnnotationConfig(type)?.properties ?? [];

    return [...additional, ...system, ...base];
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
          const nestedFields: PropertyConfig[] = curr.annotations?.properties ?? [];

          total.push(...nestedFields);
        }

        return total;
      },
      [],
    );

    // Properties for the given annotation type (no matter which level)
    const byAnnotationType: PropertyConfig[] =
      getAvailableCollectionAnnotationConfigs(collectionNodeLabels).find(
        t => t.type === annotationType,
      )?.properties ?? [];

    return [...byDefault, ...byCollectionType, ...byAnnotationType];
  }

  // TODO: This is a hack since the guidelines structure can change. It should be refactored to use the same structure as the annotations.
  function getCollectionAnnotationConfig(
    collectionLabels: string[],
    annotationType: string,
  ): AnnotationType {
    const availableConfigs: AnnotationType[] =
      getAvailableCollectionAnnotationConfigs(collectionLabels);

    const desired: AnnotationType = availableConfigs.find(t => t.type === annotationType);

    return desired;
  }

  /**
   * Retrieves all available entity configurations for annotations from the guidelines.
   *
   * This method combines the entities defined in the annotations and collections sections
   * of the guidelines and removes any duplicates. It is currently a hack since the guidelines structure can change.
   *
   * @return {AnnotationConfigEntity[]} The combined and deduplicated entities.
   */
  function getAvailableAnnotationEntityConfigs(): AnnotationConfigEntity[] {
    const baseAnnotationEntities: AnnotationConfigEntity[] =
      guidelines.value.annotations.entities ?? [];

    const baseCollectionEntities: AnnotationConfigEntity[] =
      guidelines.value.collections.annotations.entities ?? [];

    const additionalCollectionEntities: AnnotationConfigEntity[] =
      guidelines.value.collections.types.flatMap(c => c.annotations?.entities ?? []);

    const combined: AnnotationConfigEntity[] = [
      ...baseAnnotationEntities,
      ...baseCollectionEntities,
      ...additionalCollectionEntities,
    ];

    const unique: AnnotationConfigEntity[] = combined.reduce<AnnotationConfigEntity[]>(
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

  function getAvailableCollectionAnnotationConfigs(
    collectionNodeLabels: string[],
  ): AnnotationType[] {
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
   * Retrieves the available labels that can be assigned to a a Text node.
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
    const system: PropertyConfig[] = guidelines.value?.collections.properties.system ?? [];
    const base: PropertyConfig[] = guidelines.value?.collections.properties.base ?? [];
    const additional: PropertyConfig[] =
      guidelines.value?.collections.types.reduce((total: PropertyConfig[], curr) => {
        if (nodeLabels.includes(curr.additionalLabel)) {
          total.push(...curr.properties);
        }
        return total;
      }, []) ?? [];

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

  /**
   * Sorts each group of annotation types alphabetically by their type within their respective category.
   *
   * @return {Record<string, AnnotationType[]>} An object where the keys are the categories and the values are arrays of sorted annotation types.
   */
  function sortAnnotationTypesInGroup(): Record<string, AnnotationType[]> {
    return Object.fromEntries(
      Object.entries(groupedAnnotationTypes.value).map(([category, types]) => [
        category,
        types.toSorted((a, b) => a.type.localeCompare(b.type)),
      ]),
    );
  }

  function getConfiguredExtensions(): Extension[] {
    const CustomHeading = Heading.extend({
      name: 'customHeading',

      addCommands() {
        return {
          toggleCustomHeading:
            () =>
            ({ commands, tr }) => {
              return commands.updateAttributes('customHeading', { level: 2 });
            },
        };
      },
      addOptions() {
        return {
          ...this.parent?.(),
          // levels: [1, 2, 3],
          hola: [],
        };
      },

      addAttributes() {
        // console.log(this);
        // console.log(this.parent?.());
        return {
          ...this.parent?.(), // keep existing heading attrs like "level"
          teiType: {
            default: 'div',
            // rendered: false,
            parseHTML(element) {
              element.getAttribute('teiType');
            },
          },
          color: {
            default: 'green',
            // rendered: false,
            renderHTML(attributes) {
              return {
                'data-bg-color': attributes.color,
                style: `background-color: ${attributes.color}`,
              };
            },
          },
        };
      },

      parseHTML() {
        return [
          {
            tag: 'h1',
          },
        ];
      },

      renderHTML({ HTMLAttributes, node }) {
        // console.log(node.attrs);
        // console.log(HTMLAttributes);
        console.log(HTMLAttributes);
        return [
          'h' + node.attrs.level,
          {
            ...HTMLAttributes,
            // teiType: HTMLAttributes.teiType + '' + node.attrs.level,
            lineHeight: HTMLAttributes.lineHeight,
          },
          0,
        ];
      },
    });

    return [
      Document,
      Paragraph,
      Text,
      CustomHeading,
      Heading,
      Bold,
      LineHeight.configure({
        types: ['paragraph', 'heading', 'customHeading'],
        lineHeight: 1,
      }),
      TextAlign.configure({
        types: ['paragraph', 'heading', 'customHeading'],
      }),
      UniqueID.configure({
        types: 'all',
        attributeName: 'anno-uuid',
        generateID: () => crypto.randomUUID(),
      }),
    ];
  }

  return {
    availableCollectionLabels,
    error: readonly(error),
    groupedAndSortedAnnotationTypes,
    groupedAnnotationTypes,
    guidelines,
    isFetching: readonly(isFetching),
    isInitialized: readonly(isInitialized),
    annotationHasConstraints,
    getAllCollectionConfigFields,
    getAnnotationConfig,
    getAnnotationFields,
    getAvailableAnnotationResourceConfigs: getAvailableAnnotationEntityConfigs,
    getAvailableCollectionAnnotationConfigs,
    getAvailableCollectionLabels,
    getAvailableTextLabels,
    getCollectionAnnotationFields,
    getCollectionAnnotationConfig,
    getCollectionConfigFields,
    getConfiguredExtensions,
    initializeGuidelines,
  };
}
