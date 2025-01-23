import IAnnotation from './IAnnotation';
import ICharacter from './ICharacter';
import IEntity from './IEntity';
import IText from './IText';

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
  additionalTexts: {
    // TODO: Technically, this is not an IText. Fix when changing route structure
    [index: string]: IText | null;
  };
  normdata: {
    [index: string]: IEntity[];
  };
  properties: IAnnotation;
}

export type AnnotationType = {
  additionalTexts: { name: string; nodeLabel: string }[];
  category: string;
  defaultSelected: boolean;
  isSeparator?: boolean;
  isZeroPoint?: boolean;
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
  collectionUuid: string;
  characters: ICharacter[];
  text: string;
  uuidEnd: string;
  uuidStart: string;
};

export type CollectionProperty = {
  name: string /* folioEnd, label, websiteUrl */;
  type: string /* raw string, dropdown, multiple options */;
  required: boolean /* required or optional */;
  editable: boolean /* Editable by user */;
  visible: boolean /* Visible by user */;
  // options?: string[] /* Options if type is dropdown */;
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
