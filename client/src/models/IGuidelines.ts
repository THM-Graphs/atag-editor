import {
  AnnotationConfigResource,
  AnnotationProperty,
  AnnotationType,
  CollectionProperty,
} from './types';

export interface IGuidelines {
  collections: {
    [index: string] /* letter, document etc. */ : {
      additionalLabel: string /* "Letter" etc. */;
      properties: CollectionProperty[];
    };
  };
  annotations: {
    additionalTexts: string[];
    types: AnnotationType[];
    properties: AnnotationProperty[];
    resources: AnnotationConfigResource[];
  };
}
