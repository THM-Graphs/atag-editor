import IAnnotation from './IAnnotation.js';
import ICharacter from './ICharacter.js';

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
  isZeroPoint?: boolean;
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

export type Character = {
  data: ICharacter;
  annotations: AnnotationReference[];
};

export type CharacterPostData = {
  collectionUuid: string;
  uuidStart: string;
  uuidEnd: string;
  characters: ICharacter[];
};
