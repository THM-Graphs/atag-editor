import 'vue-router';
import { Collection, NodeAncestry } from './models/types';

declare module 'vue-router' {
  /**
   * Extended type for vue-router's `meta` field.
   */
  interface RouteMeta {
    collection?: Collection;
    ancestryPaths?: NodeAncestry[];
  }
}
