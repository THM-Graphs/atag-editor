import IAnnotation from './IAnnotation.js';
import ICharacter from './ICharacter.js';
import ICollection from './ICollection.js';
import IEntity from './IEntity.js';
import IText from './IText.js';

export type AdditionalText = {
  collection: Collection;
  text: Text;
};

export type Annotation = {
  characterUuids: string[];
  data: AnnotationData;
  endUuid: string;
  initialData: AnnotationData;
  isTruncated: boolean;
  startUuid: string;
  status: 'existing' | 'created' | 'deleted';
};

export interface AnnotationData {
  additionalTexts: AdditionalText[];
  entities: {
    [index: string]: IEntity[];
  };
  properties: IAnnotation;
}

export type AnnotationType = {
  category: string;
  defaultSelected: boolean;
  isSeparator?: boolean;
  isZeroPoint?: boolean;
  hasAdditionalTexts?: boolean;
  hasEntities?: boolean;
  properties?: PropertyConfig[];
  shortcut: string[];
  text: string;
  type: string;
};

export type AnnotationReference = {
  isFirstCharacter: boolean;
  isLastCharacter: boolean;
  subType: string | null;
  type: string;
  uuid: string;
};

export type AnnotationConfigEntity = {
  category: string;
  nodeLabel: string;
};

export type BaseNodeData = {
  uuid: string;
};

export type Character = {
  data: ICharacter;
  annotations: AnnotationReference[];
};

export type CharacterPostData = {
  characters: ICharacter[];
  text: string;
  textUuid: string;
  uuidEnd: string;
  uuidStart: string;
};

export type Collection = Node<ICollection>;

export type CollectionAccessObject = {
  annotations: AnnotationData[];
  collection: Collection;
  collections: Collection[];
  texts: Text[];
};

export type CollectionPostData = {
  data: CollectionAccessObject;
  initialData: CollectionAccessObject;
};

export type CollectionPreview = {
  collection: Collection;
  nodeCounts: {
    annotations: number;
    texts: number;
    collections: number;
  };
};

export type MalformedAnnotation = {
  reason: 'indexOutOfBounds' | 'unconfiguredType';
  data: StandoffAnnotation;
};

export type Node<T extends BaseNodeData> = {
  data: T;
  nodeLabels: string[];
};

export type PaginationData = {
  limit: number;
  order: string;
  search: string;
  skip: number;
  sort: string;
  totalRecords: number;
};

export type PaginationResult<T> = {
  data: T;
  pagination: PaginationData;
};

export type PropertyConfig = {
  name: string /* folioEnd, label, websiteUrl */;
  type: PropertyConfigDataType /* raw string, dropdown, multiple options */;
  required: boolean /* required or optional */;
  editable: boolean /* Editable by user */;
  visible: boolean /* Visible by user */;
  /* Only relevant if type is "array" */
  items?: Partial<PropertyConfig>;
  minItems?: number;
  maxItems?: number;
  /* Only relevant if type is "number"/"integer" */
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  /* Only relevant if type is "string" */
  minLength?: number;
  maxLength?: number;
  options?: string[] | number[] /* Options if type is dropdown */;
  template?: PropertyConfigStringTemplate /* Render as normal input or textarea? */;
};

export type PropertyConfigDataType =
  | 'array'
  | 'boolean'
  | 'date'
  | 'date-time'
  | 'integer'
  | 'number'
  | 'string'
  | 'time';

export type PropertyConfigStringTemplate = 'input' | 'textarea';

export type StandoffAnnotation = {
  [key: string]: string | number | boolean;
  start: number;
  end: number;
  text: string;
  type: string;
};

export type StandoffJson = {
  annotations: StandoffAnnotation[];
  text: string;
};

export type Text = Node<IText>;

export type TextAccessObject = {
  collection: Collection;
  path: Text[] | Collection[];
  text: Text;
};
