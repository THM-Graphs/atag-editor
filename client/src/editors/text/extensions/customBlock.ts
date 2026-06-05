import { Node } from '@tiptap/core';

/**
 * Generic tiptap block node for project-defined structural annotation types that are not
 * pre-configured built-ins (paragraph, heading, table, ...). The semantic neo4j type is stored
 * in attrs._annotationData.type so that neo4jType !== tiptapNodeType.
 *
 * Container rules are enforced during standoff→tiptap conversion via the `contains` field in
 * the guidelines config; the tiptap schema itself allows any block content.
 */
export const CustomBlock = Node.create({
  name: 'customBlock',

  group: 'block',

  content: 'block+',

  renderHTML({ node, HTMLAttributes }) {
    const type: string = node.attrs._type ?? node.attrs._annotationData?.type ?? 'customBlock';

    return ['div', { ...HTMLAttributes, 'data-annotation-type': type }, 0];
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-annotation-type]',
        getAttrs: el => ({
          _annotationData: (() => {
            try {
              return JSON.parse((el as HTMLElement).getAttribute('data-block') ?? 'null');
            } catch {
              return null;
            }
          })(),
        }),
      },
    ];
  },
});
