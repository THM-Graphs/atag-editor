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
   * Redirects to the column view path with the collection ancestry as a query parameter.
   *
   * When navigating to a specific collection with given UUID, this function fetches the ancestry of the item
   * and redirects to the path with the collection ancestry as a query parameter.
   *
   * Created to redirect links that point to a location (`/collections/:uuid`) to their representation
   * in the column view (`?path=uuid1,uuid2,uuid3,...`).
   *
   * @param {RouteLocationNormalized} route - The route object containing the route parameters.
   * @returns {Promise<RouteLocationRaw>} - A promise that resolves with the redirect location.
   */
  async function redirectToCollectionPath(
    route: RouteLocationNormalized,
  ): Promise<RouteLocationRaw> {
    const uuid: string = route.params.uuid as string;
    const ancestryPaths: NodeAncestry[] = await api.getCollectionAncestry(uuid);
    const desired: NodeAncestry | null = ancestryPaths[0] ?? null;

    let pathQuery: string = '';

    // The api response only contains item's the ancestry, not the item itself
    if (desired?.length > 0) {
      pathQuery = [...desired.map(n => n.data.uuid), uuid].join(',');
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
