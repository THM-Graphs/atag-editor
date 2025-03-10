import {
  AnnotationConfigResource,
  AnnotationProperty,
  AnnotationType,
  CollectionProperty,
} from './types';

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
