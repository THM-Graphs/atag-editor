import IAnnotation from './IAnnotation';
import ICharacter from './ICharacter';
import ICollection from './ICollection';
import IEntity from './IEntity';
import IText from './IText';

export type PropertyConfigDataType = 'array' | 'boolean' | 'integer' | 'number' | 'string';
export type PropertyConfigStringFormat = 'date' | 'date-time' | 'duration' | 'time';
export type PropertyConfigStringTemplate = 'input' | 'textarea';

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
  normdata: {
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
  hasNormdata?: boolean;
  properties?: AnnotationProperty[];
  shortcut: string[];
  text: string;
  type: string;
};

export type AnnotationProperty = {
  name: string /* type, subtype, text, url */;
  format?: PropertyConfigStringFormat /* Specifies string format, e.g. date, date-time, duration, time */;
  type: PropertyConfigDataType /* raw string, dropdown, multiple options */;
  required: boolean /* required or optional */;
  editable: boolean /* Editable by user */;
  visible: boolean /* Visible by user */;
  options?: string[] /* Options for dropdown */;
  template?: PropertyConfigStringTemplate /* Render as normal input or textarea? */;
};

export type AnnotationReference = {
  isFirstCharacter: boolean;
  isLastCharacter: boolean;
  subtype: string | null;
  type: string;
  uuid: string;
};

export type AnnotationConfigResource = {
  category: string;
  nodeLabel: string;
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

export type Collection = {
  data: ICollection;
  nodeLabels: string[];
};

export type CollectionAccessObject = {
  collection: Collection;
  texts: Text[];
};

export type CollectionProperty = {
  name: string /* folioEnd, label, websiteUrl */;
  format?: PropertyConfigStringFormat /* Specifies string format, e.g. date, date-time, duration, time */;
  type: PropertyConfigDataType /* raw string, dropdown, multiple options */;
  required: boolean /* required or optional */;
  editable: boolean /* Editable by user */;
  visible: boolean /* Visible by user */;
  options?: string[] /* Options if type is dropdown */;
  template?: PropertyConfigStringTemplate /* Render as normal input or textarea? */;
};

export type CollectionPostData = {
  data: CollectionAccessObject;
  initialData: CollectionAccessObject;
};

export type HistoryStack = HistoryRecord[];

export type HistoryRecord = {
  annotations: Annotation[];
  characters: Character[];
};

export type MalformedAnnotation = {
  reason: 'indexOutOfBounds' | 'unconfiguredType';
  data: StandoffAnnotation;
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

export type Text = {
  nodeLabels: string[];
  data: IText;
};

export type TextAccessObject = {
  collection: Collection;
  path: Text[] | Collection[];
  text: Text;
};
