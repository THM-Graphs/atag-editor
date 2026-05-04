import { BaseNodeData } from './types';

export type IAnnotation = BaseNodeData & {
  [keyof: string]: unknown;
  endIndex: number;
  startIndex: number;
  subType?: string | number;
  text: string;
  type: string;
};
