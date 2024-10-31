import { ref } from 'vue';

const shortcutMap = ref<Map<string, () => void>>(new Map());
/**
 * Store for shortcuts for annotation buttons. In contrast to other stores, this store is not initialized during mount of the Editor
 * component. Instead, each component that has a shortcut (currently only Annotation buttons) use the `registerShortcut` function
 * to map a shortcut with the corresponding action. Also, the store is not reset on unmount since the shortcuts map will be updated
 * on the next mount anyway.
 */
export function useShortcutsStore() {
  /**
   * Registers a shortcut key combination with a corresponding action (e.g. annotating text). Done within the component that has the shortcut.
   *
   * @param {string} shortcutCombo A string representing the shortcut key combination, e.g. 'Ctrl+Shift+A'.
   * @param {function} action The action to execute when the shortcut is pressed.
   * @return {void} This function does not return any value.
   */
  function registerShortcut(shortcutCombo: string, action: () => void): void {
    shortcutMap.value.set(shortcutCombo, action);
  }

  /**
   * Sorts and joins the given array of strings into a single string, with '+' in between each element.
   * This is used to normalize the shortcut keys and compare them to pressed key combination later.
   *
   * @param {string[]} keys The array of strings to sort.
   * @returns {string} The normalized string.
   */
  function normalizeKeys(keys: string[]): string {
    return keys
      .map(k => k.toLowerCase())
      .sort()
      .join('+');
  }

  return { shortcutMap, normalizeKeys, registerShortcut };
}
