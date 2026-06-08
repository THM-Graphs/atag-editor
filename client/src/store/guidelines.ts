import { computed, readonly, ref } from 'vue';
import { IGuidelines } from '../models/IGuidelines';
import { useFilterStore } from './filter';
import {
  AnnotationConfigEntity,
  AnnotationType,
  PropertyConfig,
  AnnotationNode,
  BaseNodeLabel,
} from '../models/types';

const { initializeFilter } = useFilterStore();
const guidelines = ref<IGuidelines>();
const isFetching = ref<boolean>(false);
const error = ref<any>(null);
const isInitialized = computed<boolean>(() => guidelines.value && !isFetching.value);

const groupedAnnotationTypes = ref<Record<string, AnnotationType[]>>();
const availableCollectionLabels = ref<string[]>([]);
const availableEntityLabels = ref<string[]>([]);
const availableTextLabels = ref<string[]>([]);
const groupedAndSortedAnnotationTypes = ref<Record<string, AnnotationType[]>>();

// Built-in structural annotation types with their tiptap hierarchy rules.
// Projects can extend these (add properties) via annotations.types in the guidelines JSON.
// "contains" drives the dynamic STRUCTURAL_CHILDREN map used during standoff→tiptap conversion.
const BUILTIN_STRUCTURAL_CONFIGS: AnnotationType[] = [
  {
    type: 'paragraph',
    isBlock: true,
    contains: [],
    topLevel: true,
    priority: 80,
    properties: [],
    shortcut: [],
    text: '',
    category: 'structure',
    defaultSelected: true,
  },
  {
    type: 'heading',
    isBlock: true,
    contains: [],
    topLevel: true,
    priority: 70,
    properties: [
      {
        name: 'level',
        type: 'number',
        minimum: 1,
        maximum: 6,
        required: true,
        editable: true,
        visible: true,
      },
    ],
    shortcut: [],
    text: '',
    category: 'structure',
    defaultSelected: true,
  },
  {
    type: 'hardBreak',
    isBlock: true,
    contains: [],
    topLevel: false,
    priority: 90,
    properties: [],
    shortcut: [],
    text: '',
    category: 'structure',
    defaultSelected: true,
  },
  {
    type: 'table',
    isBlock: true,
    // caption/heading can be added later by extending contains via guidelines JSON
    contains: ['tableRow'],
    topLevel: true,
    priority: 10,
    properties: [],
    shortcut: [],
    text: '',
    category: 'structure',
    defaultSelected: true,
  },
  {
    type: 'tableRow',
    isBlock: true,
    contains: ['tableHeader', 'tableCell'],
    topLevel: false,
    priority: 20,
    properties: [],
    shortcut: [],
    text: '',
    category: 'structure',
    defaultSelected: true,
  },
  {
    type: 'tableCell',
    isBlock: true,
    contains: ['paragraph', 'heading', 'bulletList'],
    topLevel: false,
    priority: 30,
    properties: [],
    shortcut: [],
    text: '',
    category: 'structure',
    defaultSelected: true,
  },
  {
    type: 'tableHeader',
    isBlock: true,
    contains: ['paragraph', 'heading', 'bulletList'],
    topLevel: false,
    priority: 30,
    properties: [
      { name: 'rowspan', type: 'number', required: true, editable: true, visible: true },
      { name: 'colspan', type: 'number', required: true, editable: true, visible: true },
    ],
    shortcut: [],
    text: '',
    category: 'structure',
    defaultSelected: true,
  },
  {
    type: 'bulletList',
    isBlock: true,
    // caption/heading can be added later by extending contains via guidelines JSON
    contains: ['listItem'],
    topLevel: true,
    priority: 40,
    properties: [],
    shortcut: [],
    text: '',
    category: 'structure',
    defaultSelected: true,
  },
  {
    type: 'listItem',
    isBlock: true,
    contains: ['paragraph', 'heading', 'bulletList'],
    topLevel: false,
    priority: 50,
    properties: [],
    shortcut: [],
    text: '',
    category: 'structure',
    defaultSelected: true,
  },
];

export const BUILTIN_STRUCTURAL_TYPES_SET: ReadonlySet<string> = new Set(
  BUILTIN_STRUCTURAL_CONFIGS.map(c => c.type),
);

// Merged structural configs: built-ins + any isBlock:true entries from the guidelines JSON.
// Populated after initializeGuidelines; starts from built-in defaults.
const mergedStructuralConfigs = ref<AnnotationType[]>([...BUILTIN_STRUCTURAL_CONFIGS]);

// Map of structural type → allowed direct child structural types.
// Replaces the hardcoded STRUCTURAL_CHILDREN constant in standoffConverter.ts.
const structuralChildrenMap = computed<Record<string, string[]>>(() =>
  Object.fromEntries(
    mergedStructuralConfigs.value
      .filter(c => c.contains && c.contains.length > 0)
      .map(c => [c.type, c.contains!]),
  ),
);

// Structural types that may appear directly under the document root.
const docContainsTypes = computed<string[]>(() =>
  mergedStructuralConfigs.value.filter(c => c.topLevel === true).map(c => c.type),
);

function buildMergedStructuralConfigs(guidelinesData: IGuidelines): AnnotationType[] {
  // Deep-copy built-ins so mutations don't affect the constant.
  const result: AnnotationType[] = BUILTIN_STRUCTURAL_CONFIGS.map(c => ({
    ...c,
    properties: [...(c.properties ?? [])],
    contains: [...(c.contains ?? [])],
  }));

  for (const entry of guidelinesData.annotations.types) {
    if (!entry.isBlock) continue;

    const existing = result.find(c => c.type === entry.type);
    if (existing) {
      // Extend built-in: append any extra properties defined in JSON
      existing.properties = [...(existing.properties ?? []), ...(entry.properties ?? [])];
      // Optionally extend contains (add types not already listed)
      if (entry.contains) {
        const current = existing.contains ?? [];
        existing.contains = [...current, ...entry.contains.filter(t => !current.includes(t))];
      }
    } else {
      // New project-specific custom structural type
      result.push({
        ...entry,
        properties: [...(entry.properties ?? [])],
        contains: [...(entry.contains ?? [])],
      });
    }
  }

  return result;
}

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
    mergedStructuralConfigs.value = buildMergedStructuralConfigs(guidelinesData);
    groupedAnnotationTypes.value = groupAnnotationTypes();
    groupedAndSortedAnnotationTypes.value = sortAnnotationTypesInGroup();
    availableCollectionLabels.value = getAvailableCollectionLabels();
    availableEntityLabels.value = getAvailableEntityLabels();
    availableTextLabels.value = getAvailableTextLabels();

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

  function getStructuralAnnotationConfig(type: string): AnnotationType | undefined {
    return mergedStructuralConfigs.value.find(t => t.type === type);
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
   * Retrieves the available labels that can be assigned to a an Entity node.
   *
   * @return {string[]} The available labels.
   */
  function getAvailableEntityLabels(): string[] {
    return guidelines.value?.annotations.entities.map(e => e.nodeLabel) ?? [];
  }

  /**
   * Retrieves the available labels that can be assigned to a a Text node.
   *
   * @return {string[]} The available labels.
   */
  function getAvailableTextLabels(): string[] {
    return guidelines.value?.texts.additionalLabels ?? [];
  }

  /**
   * Retrieves the available labels that can be assigned to a node with given base type.
   *
   * Convenience wrapper for when only the base node label is known.
   *
   * @return {string[]} The available labels.
   */
  function getAvailableNodeLabels(baseLabel: BaseNodeLabel): string[] {
    switch (baseLabel) {
      case 'Collection':
        return availableCollectionLabels.value;
      case 'Entity':
        return availableEntityLabels.value;
      case 'Content':
        return availableTextLabels.value;
      default:
        return [];
    }
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
   * Returns whether an annotation is a zero-point annotation, based on its type
   * config or its own `isZeroPoint` property.
   *
   * @param annotation - The annotation to check.
   * @returns `true` if the annotation is a zero-point annotation, `false` otherwise.
   */
  function isZeroPoint(annotation: AnnotationNode): boolean {
    const config: AnnotationType = getAnnotationConfig(annotation.data.type);

    if (!config) {
      console.error(
        `The configuration of annotation type "${annotation.data.type} could not be found`,
      );

      return false;
    }

    // TODO: Should the isZeroPoint property of the annotation also (or instead) be included?
    return config.isZeroPoint || annotation.data.isZeroPoint === true;
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

  function getPriorityForType(type: string): number {
    return mergedStructuralConfigs.value.find(c => c.type === type)?.priority ?? 100;
  }

  return {
    availableCollectionLabels,
    availableEntityLabels,
    availableTextLabels,
    error: readonly(error),
    groupedAndSortedAnnotationTypes,
    groupedAnnotationTypes,
    guidelines,
    isFetching: readonly(isFetching),
    isInitialized: readonly(isInitialized),
    structuralAnnotationConfigs: mergedStructuralConfigs,
    getStructuralAnnotationConfigs: (): AnnotationType[] => mergedStructuralConfigs.value,
    getPriorityForType,
    structuralChildrenMap,
    docContainsTypes,
    annotationHasConstraints,
    getAllCollectionConfigFields,
    getAnnotationConfig,
    getAnnotationFields,
    getAvailableAnnotationResourceConfigs: getAvailableAnnotationEntityConfigs,
    getAvailableCollectionAnnotationConfigs,
    getAvailableCollectionLabels,
    getAvailableEntityLabels,
    getAvailableNodeLabels,
    getAvailableTextLabels,
    getCollectionAnnotationFields,
    getCollectionAnnotationConfig,
    getCollectionConfigFields,
    getStructuralAnnotationConfig,
    initializeGuidelines,
    isZeroPoint,
  };
}
