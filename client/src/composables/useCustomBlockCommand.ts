import { Editor } from '@tiptap/core';

/**
 * Provides toggle commands for project-defined custom structural block annotations.
 * Built-in structural types (heading, table, ...) have their own dedicated tiptap commands;
 * this composable handles the generic customBlock extension used for all other types.
 */
export function useCustomBlockCommand(editor: Editor | null | undefined) {
  function isCustomBlockActive(type: string): boolean {
    if (!editor) {
      return false;
    }

    const { $anchor } = editor.state.selection;

    for (let depth = $anchor.depth; depth > 0; depth--) {
      const node = $anchor.node(depth);

      if (node.type.name === 'customBlock' && node.attrs._annotationData?.type === type) {
        return true;
      }
    }
    return false;
  }

  function toggleCustomBlock(type: string): void {
    if (!editor) {
      return;
    }

    if (isCustomBlockActive(type)) {
      editor.chain().focus().lift('customBlock').run();
    } else {
      editor
        .chain()
        .focus()
        .wrapIn('customBlock', { _annotationData: { type }, _type: type })
        .run();
    }
  }

  return { isCustomBlockActive, toggleCustomBlock };
}
