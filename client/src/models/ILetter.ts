import ICollection from './ICollection.js';
import IText from './IText.js';

export default interface ILetter {
  guid: string;
  metadata: ICollection;
  text: IText;
}
