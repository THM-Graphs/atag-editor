import ICharacter from './ICharacter.js';

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
