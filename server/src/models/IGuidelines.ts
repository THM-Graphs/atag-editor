import {
  AnnotationConfigResource,
  AnnotationProperty,
  AnnotationType,
  CollectionProperty,
} from './types.js';

export interface IGuidelines {
  collections: {
    type: string;
    additionalLabel: string /* "Letter" etc. */;
    properties: CollectionProperty[];
  }[];
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
