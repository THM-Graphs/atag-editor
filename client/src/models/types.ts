import IAnnotation from './IAnnotation';
import ICharacter from './ICharacter';

export type Annotation = {
  characterUuids: string[];
  data: IAnnotation;
  endUuid: string;
  initialData: IAnnotation;
  isTruncated: boolean;
  startUuid: string;
  status: 'existing' | 'created' | 'deleted';
};

export type AnnotationType = {
  category: string;
  defaultSelected: boolean;
  text: string;
  type: string;
  properties?: AnnotationProperty[];
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
  type: string;
  uuid: string;
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

export type HistoryStack = HistoryRecord[];

export type HistoryRecord = {
  annotations: Annotation[];
  characters: Character[];
};
