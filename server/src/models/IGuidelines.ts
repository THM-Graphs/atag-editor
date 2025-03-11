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
      level:
        | 'primary'
        | 'secondary' /* Quick fix to determine which collections should be loaded into the overview table */;
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
