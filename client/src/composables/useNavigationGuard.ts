import { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';
import { NodeAncestry } from '../models/types';
import { useAppStore } from '../store/app';

export function useNavigationGuard() {
  const { activeModal, api } = useAppStore();

  function hasOpenModal(): boolean {
    if (!activeModal.value) {
      return true;
    }

    const answer: boolean = window.confirm(
      'Do you really want to leave? You should finish the action in the modal',
    );

    // cancel the navigation and stay on the same page
    if (!answer) {
      return false;
    }
  }

  /**
   * Redirects either to the column view path with the collection ancestry as a query parameter OR to the single view
   * of the collection if it has more than one ancestry path (e.g., a `Letter` an be part of multiple `Communication` collections).
   * In the single view, the user can decide the path he/she wants to open.
   *
   * When navigating to a specific collection with given UUID, this function fetches the ancestry of the item. If there are more than one
   * ancestry, the ancestries AND the collection details are attached to the route's `meta` field to be accessed in the
   * component later.
   *
   * Created to redirect links that point to a location (`/collections/:uuid`) to their representation
   * in the column view (`?path=uuid1,uuid2,uuid3,...`).
   *
   * @param {RouteLocationNormalized} route - The route object containing the route parameters.
   * @returns {Promise<RouteLocationRaw | boolean>} - A promise that resolves with either the redirect location if the collection has ONLY ONE ancestry path or `true` if not
   */
  async function redirectToCollectionPath(
    route: RouteLocationNormalized,
  ): Promise<RouteLocationRaw | boolean> {
    const uuid: string = route.params.uuid as string;
    const ancestryPaths: NodeAncestry[] = await api.getCollectionAncestry(uuid);

    if (ancestryPaths.length > 1) {
      const collection = await api.getCollection(uuid);

      route.meta.collection = collection;
      route.meta.ancestryPaths = ancestryPaths;

      return true;
    }

    const singleAncestry: NodeAncestry | null = ancestryPaths[0] ?? null;

    let pathQuery: string = '';

    // The api response only contains item's the ancestry, not the item itself
    if (singleAncestry?.length > 0) {
      pathQuery = [...singleAncestry.map(n => n.data.uuid), uuid].join(',');
    } else {
      pathQuery = uuid;
    }

    return {
      path: '/',
      query: {
        path: pathQuery,
      },
    };
  }

  return { hasOpenModal, redirectToCollectionPath };
}
