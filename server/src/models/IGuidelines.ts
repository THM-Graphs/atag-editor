import {
  AnnotationConfigResource,
  AnnotationPropertyConfig,
  AnnotationType,
  CollectionPropertyConfig,
} from './types.js';

export interface IGuidelines {
  collections: {
    properties: {
      system: CollectionPropertyConfig[];
      base: CollectionPropertyConfig[];
    };
    types: {
      additionalLabel: string;
      level:
        | 'primary'
        | 'secondary' /* Quick fix to determine which collections should be loaded into the overview table */;
      properties: CollectionPropertyConfig[];
    }[];
  };
  annotations: {
    additionalTexts: string[];
    types: AnnotationType[];
    properties: AnnotationPropertyConfig[];
    resources: AnnotationConfigResource[];
  };
  texts: {
    additionalLabels: string[];
  };
}
