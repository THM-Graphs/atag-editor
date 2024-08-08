import { AnnotationType } from './types';

export interface IGuidelines {
  collections: {
    [index: string] /* letter, document etc. */ : {
      additionalLabel: string /* "Letter" etc. */;
      properties: {
        name: string /* folioEnd, label, websiteUrl */;
        type: string /* raw string, dropdown, multiple options */;
        required: boolean /* required or optional */;
        editable: boolean /* Editable by user */;
        visible: boolean /* Visible by user */;
        // options?: string[] /* Options if type is dropdown */;
      }[];
    };
  };
  annotations: {
    types: AnnotationType[];
    properties: {
      name: string /* type, subtype, text, url */;
      type: string /* raw string, dropdown, multiple options */;
      required: boolean /* required or optional */;
      editable: boolean /* Editable by user */;
      visible: boolean /* Visible by user */;
    }[];
  };
}
