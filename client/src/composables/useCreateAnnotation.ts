import { useGuidelinesStore } from '../store/guidelines';
import { Annotation, AnnotationNode, PropertyConfig } from '../models/types';
import { getDefaultValueForProperty } from '../utils/helper/helper';
import { IAnnotation } from '../models/IAnnotation';

/**
 * Return type for the `useCreateAnnotation` hook.
 * Provides factory functions for creating different types of annotations.
 */
type UseCreateAnnotationReturnType = {
  createCollectionAnnotation: (params: {
    nodeLabels: string[];
    subType?: string | number;
    type: string;
  }) => Annotation;
  createTextAnnotation: (params: {
    selectedText: string;
    subType?: string | number;
    type: string;
  }) => Annotation;
};

/**
 * A composable function that is used to create annotations for collections and texts.
 * It exposes two functions: One for adding annotations to text (mostly used), and one for adding annotations to collections.
 *
 * Since the annotations currently differ a bit (text annotations contain more character-specific data), there must be two functions.
 * In the future, the annotation handling should be more generic.
 *
 * @param {('Content' | 'Collection')} scope - The scope for which the annotation is being created. This determines the type of annotation that will be created.
 * @returns {UseCreateAnnotationReturnType} An object containing the functions to create annotations.
 */
export function useCreateAnnotation(
  scope: 'Content' | 'Collection',
): UseCreateAnnotationReturnType {
  const { getAnnotationFields, getCollectionAnnotationFields } = useGuidelinesStore();

  /**
   * Creates an annotation object with the given parameters.
   *
   * The annotation object contains three properties: `properties` (the annotation node data),
   * `entities` (empty array) and `additionalTexts` (empty array). Entites and additionalTexts are added to keep the structure consistent.
   *
   * @param {Object} params - The parameters object. Contains the fields, subType (optional) and type of the annotation.
   * @returns {Annotation} An object containing the properties, entities and additional texts of the annotation.
   */
  function createAnnotationObject(params: {
    fields: PropertyConfig[];
    subType?: string | number;
    type: string;
  }): Annotation {
    const nodeData: IAnnotation = createNodeData({ ...params });
    const node: AnnotationNode = {
      data: nodeData,
      nodeLabels: ['Annotation'],
    };

    const newAnnotation: Annotation = {
      node,
      connectedNodes: [],
      meta: {
        status: 'created',
      },
    };

    return newAnnotation;
  }

  /**
   * Creates a base node data object with the given parameters.
   *
   * The object contains the annotation type, subType (if applicable), and fields specific to the annotation type.
   * If the subType field exists, but not subType was provided, the first option is set as default value.
   *
   * @param {Object} params - The parameters object. Contains the fields, subType (optional) and type of the annotation.
   * @returns {IAnnotation} A base node data object with the given parameters.
   */
  function createBaseNodeData(params: {
    fields: PropertyConfig[];
    subType?: string | number;
    type: string;
  }): IAnnotation {
    const { type, subType, fields } = params;
    const subTypeField: PropertyConfig | undefined = fields.find(field => field.name === 'subType');

    const baseNodeData: IAnnotation = {} as IAnnotation;

    fields.forEach((field: PropertyConfig) => {
      baseNodeData[field.name] =
        field?.required === true ? getDefaultValueForProperty(field.type) : null;
    });

    // Set explicitly after the fields are set to override default values if necessary
    baseNodeData.type = type;
    baseNodeData.uuid = crypto.randomUUID();

    // If a subType field exists (filled with a default value just before), but not subType was provided
    // (= the user clicked the button directly instead of selecting an entry from the dropdown),
    // set the first option as default value
    if (subTypeField) {
      baseNodeData.subType = subType ?? (subTypeField.options || [])[0];
    }

    return baseNodeData;
  }

  /**
   * Creates an annotation for a collection with given node labels and type.
   * The subType is optional and will default to the first option if not provided.
   *
   * @param {Object} params - The parameters object. Contains the type, subType (optional) and node labels of the collection.
   * @returns {Annotation} An object containing the properties, entities and additional texts of the annotation.
   */
  function createCollectionAnnotation(params: {
    type: string;
    subType?: string | number;
    nodeLabels: string[];
  }): Annotation {
    const { type, nodeLabels } = params;

    const fields: PropertyConfig[] = getCollectionAnnotationFields(nodeLabels, type);

    const annotationObject: Annotation = createAnnotationObject({ ...params, fields });

    return annotationObject;
  }

  /**
   * Creates a node data object with the given parameters.
   *
   * The node data object contains base node data (see `createBaseNodeData`) and, if the scope is 'Content',
   * additional fields specific to content annotations are added (`startIndex`, `endIndex` and `text`).
   *
   * @param {Object} params - The parameters object. Contains the fields, subType (optional) and type of the annotation.
   * @returns {IAnnotation} A node data object with the given parameters.
   */
  function createNodeData(params: {
    fields: PropertyConfig[];
    subType?: string | number;
    type: string;
  }): IAnnotation {
    const nodeData: IAnnotation = createBaseNodeData(params);

    // Other fields specifically for content annotations
    if (scope === 'Content') {
      // Both can be 0 since the real values are created in the backend on save
      nodeData.startIndex = 0;
      nodeData.endIndex = 0;
      // Empty string since value is added in createTextAnnotation() and will be calculated on save anyway (connected characters).
      nodeData.text = '';
    }

    return nodeData;
  }

  /**
   * Creates a content annotation with the given type and subtype.
   *
   * @param {Object} params - The parameters object. Currently consists only of the type, subtype (optional) and characters to be annotated.
   * @returns {AnnotationOld} - The created content annotation object.
   */
  function createTextAnnotation(params: {
    type: string;
    subType?: string | number;
    selectedText: string;
  }): Annotation {
    const { type, selectedText } = params;

    const fields: PropertyConfig[] = getAnnotationFields(type);

    const annotation: Annotation = createAnnotationObject({ ...params, fields });

    // Initial text property from text selection.
    annotation.node.data.text = selectedText;

    return annotation;
  }

  return {
    createCollectionAnnotation,
    createTextAnnotation,
  };
}
