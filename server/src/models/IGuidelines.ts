import { AnnotationConfigResource, AnnotationType, PropertyConfig } from './types.js';

export interface IGuidelines {
  collections: {
    properties: {
      system: PropertyConfig[];
      base: PropertyConfig[];
    };
    types: {
      additionalLabel: string;
      level:
        | 'primary'
        | 'secondary' /* Quick fix to determine which collections should be loaded into the overview table */;
      properties: PropertyConfig[];
      annotations: {
        additionalTexts: string[];
        types: AnnotationType[];
        properties: PropertyConfig[];
        resources: AnnotationConfigResource[];
      };
    }[];
    annotations: {
      additionalTexts: string[];
      types: AnnotationType[];
      properties: {
        system: PropertyConfig[];
        base: PropertyConfig[];
      };
      resources: AnnotationConfigResource[];
    };
  };
  annotations: {
    additionalTexts: string[];
    types: AnnotationType[];
    properties: {
      system: PropertyConfig[];
      base: PropertyConfig[];
    };
    resources: AnnotationConfigResource[];
  };
  texts: {
    additionalLabels: string[];
  };
}
