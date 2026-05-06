import 'vue-router';
import { CollectionNode, NodeAncestry } from './models/types';

declare module 'vue-router' {
  /**
   * Extended type for vue-router's `meta` field.
   */
  interface RouteMeta {
    collection?: CollectionNode;
    ancestryPaths?: NodeAncestry[];
  }
}
