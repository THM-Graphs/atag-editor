import {
  AnnotationConfigResource,
  AnnotationProperty,
  AnnotationType,
  CollectionProperty,
} from './types.js';

export interface IGuidelines {
  collections: {
    properties: {
      system: CollectionProperty[];
      base: CollectionProperty[];
    };
    types: {
      additionalLabel: string;
      properties: CollectionProperty[];
    }[];
  };
  annotations: {
    additionalTexts: string[];
    types: AnnotationType[];
    properties: AnnotationProperty[];
    resources: AnnotationConfigResource[];
  };
  texts: {
    additionalLabels: string[];
  };
}
