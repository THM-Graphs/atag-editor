export default interface IAnnotation {
  [keyof: string]: any;
  comment: string;
  commentInternal: string;
  endIndex: number;
  originalText: string;
  startIndex: number;
  subtype: string | number;
  text: string;
  type: string;
  url: string;
  uuid: string;
}
