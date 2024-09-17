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
  scope: 'range' | 'point' /* 'point' if an annotation is "between" characters (e.g. deleted) */;
  text: string;
  type: string;
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
  uuidStart: string;
  uuidEnd: string;
  characters: ICharacter[];
};

export type HistoryStack = HistoryRecord[];

export type HistoryRecord = {
  annotations: Annotation[];
  characters: Character[];
};
