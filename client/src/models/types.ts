import IAnnotation from './IAnnotation';
import ICharacter from './ICharacter';
import ICollection from './ICollection';
import IEntity from './IEntity';
import IText from './IText';

export type AdditionalText = {
  nodeLabel: string;
  data: {
    collection: ICollection;
    text: IText;
  };
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
  type: 'text' | 'textarea' | 'checkbox' | 'selection' /* raw string, dropdown, multiple options */;
  required: boolean /* required or optional */;
  editable: boolean /* Editable by user */;
  visible: boolean /* Visible by user */;
  options?: string[] /* Options for dropdown */;
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
  nodeLabel: string;
};

export type CollectionAccessObject = {
  collection: Collection;
  texts: Text[];
};

export type CollectionProperty = {
  name: string /* folioEnd, label, websiteUrl */;
  type: string /* raw string, dropdown, multiple options */;
  required: boolean /* required or optional */;
  editable: boolean /* Editable by user */;
  visible: boolean /* Visible by user */;
  // options?: string[] /* Options if type is dropdown */;
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
  nodeLabel: string;
  data: IText;
};

export type TextAccessObject = {
  collection: Collection;
  path: Text[] | Collection[];
  text: Text;
};
