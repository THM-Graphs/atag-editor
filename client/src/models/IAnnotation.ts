export default interface IAnnotation {
  [keyof: string]: any;
  endIndex: number;
  startIndex: number;
  subtype: string | number;
  text: string;
  type: string;
  uuid: string;
}
