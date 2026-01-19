import { readonly } from 'vue';
import { useStorage } from '@vueuse/core';
import type { Bookmark, Collection, Text } from '../models/types';

export function useBookmarks() {
  const bookmarks = useStorage<Bookmark[]>('bookmarks', []);

  function addBookmark(nodeData: Collection | Text, type: 'collection' | 'text'): void {
    if (bookmarks.value.find(bookmark => bookmark.data.data.uuid === nodeData.data.uuid)) {
      console.warn('This item is already bookmarked, skip.');
      return;
    }

    bookmarks.value.push({
      data: nodeData,
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  function removeBookmark(uuid: string): void {
    bookmarks.value = bookmarks.value.filter(bookmark => bookmark.data.data.uuid !== uuid);
  }

  return {
    bookmarks: readonly(bookmarks),
    addBookmark,
    removeBookmark,
  };
}
