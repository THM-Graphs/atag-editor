import IAnnotation from './IAnnotation.js';
import ICharacter from './ICharacter.js';

export type Annotation = {
  characterUuids: string[];
  data: IAnnotation;
  endUuid: string;
  startUuid: string;
  status: 'existing' | 'created' | 'deleted' | 'edited';
};

export type AnnotationType = {
  type: string;
  category: string;
  text: string;
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
