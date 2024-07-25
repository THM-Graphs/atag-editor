export default interface IAnnotation {
  [keyof: string]: string | number;
  endIndex: number;
  startIndex: number;
  teiType: string;
  text: string;
  uuid: string;
}
