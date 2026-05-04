import { BaseNodeData } from './types.js';

export type ICollection = BaseNodeData & {
  [keyof: string]: unknown;
  label: string;
};
