import { BaseNodeData } from './types';

export type ICollection = BaseNodeData & {
  [keyof: string]: unknown;
  label: string;
};
