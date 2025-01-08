import {
  AnnotationConfigResource,
  AnnotationProperty,
  AnnotationType,
  CollectionProperty,
} from './types.js';

export interface IGuidelines {
  collections: {
    [index: string] /* letter, document etc. */ : {
      additionalLabel: string /* "Letter" etc. */;
      properties: CollectionProperty[];
    };
  };
  annotations: {
    types: AnnotationType[];
    properties: AnnotationProperty[];
    resources: AnnotationConfigResource[];
  };
}
