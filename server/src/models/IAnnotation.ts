export default interface IAnnotation {
  [keyof: string]: any;
  endIndex: number;
  startIndex: number;
  subType: string | number;
  text: string;
  type: string;
  uuid: string;
}
