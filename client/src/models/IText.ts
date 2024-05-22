import ICharacter from './ICharacter.js';
import ICollection from './ICollection.js';

export default interface IText {
  characters?: ICharacter[];
  guid: string;
  metadata?: ICollection;
  name: string;
  normalizedText: string;
  text: string;
  type: string;
}
