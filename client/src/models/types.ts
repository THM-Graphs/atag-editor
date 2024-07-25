import ICharacter from './ICharacter';

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
