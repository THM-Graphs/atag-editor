export default interface IAnnotation {
  [keyof: string]: string | number;
  comment: string;
  commentInternal: string;
  endIndex: number;
  originalText: string;
  startIndex: number;
  subtype: string;
  text: string;
  type: string;
  url: string;
  uuid: string;
}
