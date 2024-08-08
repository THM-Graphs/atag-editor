import IAnnotation from './IAnnotation';
import ICharacter from './ICharacter';

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

export type Character = {
  data: ICharacter;
  annotations: {
    uuid: string;
    isFirstCharacter: boolean;
    isLastCharacter: boolean;
  }[];
};

export type CharacterPostData = {
  collectionUuid: string;
  uuidStart: string;
  uuidEnd: string;
  characters: ICharacter[];
};
