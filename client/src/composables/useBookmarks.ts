import { DeepReadonly, readonly, Ref } from 'vue';
import { useStorage } from '@vueuse/core';
import type { Bookmark } from '../models/types';

type BookmarkParams = Omit<Bookmark, 'createdAt' | 'updatedAt'>;

type UseBookmarksReturnType = {
  bookmarks: DeepReadonly<Ref<Bookmark[]>>;
  removeBookmark: (uuid: string) => void;
  toggleBookmark: (params: BookmarkParams) => void;
};

/**
 * A composable function that provides a way to manage bookmarks in the browser's local storage.
 * It exposes a reactive ref to the bookmarks, as well as functions to remove and toggle bookmarks.
 *
 * The `toggleBookmark` function is used by interfaces which don't know the resource' state, the `removeBookmark` function
 * by the bookmark popover itself since it knows the bookmark's state
 *
 * @returns {UseBookmarksReturnType} An object containing the bookmarks reactive ref, and functions to add, remove and toggle bookmarks.
 */
export function useBookmarks(): UseBookmarksReturnType {
  const bookmarks = useStorage<Bookmark[]>('bookmarks', []);

  /**
   * Adds a new bookmark to the browser's local storage.
   *
   * @param {BookmarkParams} params - Object containing the data and type of the bookmark to be added.
   * @returns {void} This function does not return any value.
   */
  function addBookmark(params: BookmarkParams): void {
    const { data, type } = params;

    const date: Date = new Date();

    bookmarks.value.push({
      data,
      type,
      createdAt: date,
      updatedAt: date,
    });
  }

  /**
   * Removes a bookmark from the browser's local storage.
   *
   * @param {string} uuid - The UUID of the bookmark to be removed.
   * @returns {void} This function does not return any value.
   */
  function removeBookmark(uuid: string): void {
    bookmarks.value = bookmarks.value.filter(bookmark => bookmark.data.data.uuid !== uuid);
  }

  /**
   * Toggles a bookmark based on its current state. If the bookmark already exists, it is removed.
   * Otherwise, it is added.
   *
   * @param {BookmarkParams} params - Object containing the data and type of the bookmark to be toggled.
   * @returns {void} This function does not return any value.
   */
  function toggleBookmark(params: BookmarkParams): void {
    const isAlreadyBookmarked: boolean = bookmarks.value.some(
      b => b.data.data.uuid === params.data.data.uuid,
    );

    if (isAlreadyBookmarked) {
      removeBookmark(params.data.data.uuid);
    } else {
      addBookmark(params);
    }
  }

  return {
    bookmarks: readonly(bookmarks),
    removeBookmark,
    toggleBookmark,
  };
}
