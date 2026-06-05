import { Node, NodeViewRendererProps } from '@tiptap/core';
import { AnnotationNode } from '../../../models/types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    zeroPointAnnotation: {
      addZeroPointAnnotation: (annotation: AnnotationNode, position?: number) => ReturnType;
    };
  }
}

type ZeroPointAttributes = {
  uuid: string;
  annotationData: AnnotationNode;
};

export const ZeroPointAnnotation = Node.create({
  name: 'zeroPointAnnotation',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return {};
  },

  addAttributes(): Record<any, any> {
    return {
      annotationData: {
        default: null,
        keepOnSplit: true,
        isRequired: true,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-anno-uuid'),
        renderHTML: (attributes: ZeroPointAttributes) => {
          return {
            'data-anno-type': attributes.annotationData.data.type,
          };
        },
      },
      uuid: {
        default: null,
        keepOnSplit: true,
        isRequired: true,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-anno-uuid'),
        renderHTML: (attributes: ZeroPointAttributes) => {
          return {
            'data-uuid': attributes.annotationData.data.uuid,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-anno-uuid]',
      },
    ];
  },

  addNodeView() {
    // TODO: This can be more elegant
    return (nodeProps: NodeViewRendererProps) => {
      const elm: HTMLElement = document.createElement('span');
      const annotationType = nodeProps.node.attrs.annotationData.data.type;

      elm.setAttribute('data-anno-type', annotationType);

      elm.classList.add(`annotation-type-marker-${annotationType}`);

      elm.style.display = 'inline-block';

      elm.style.backgroundSize = 'contain';
      elm.style.backgroundRepeat = 'no-repeat';
      elm.style.backgroundPosition = 'center';
      elm.style.width = '16px';
      elm.style.height = '16px';

      return { dom: elm };
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes }];
  },

  addCommands() {
    return {
      addZeroPointAnnotation:
        (annotation: AnnotationNode, position?: number) =>
        ({ commands }) => {
          const pos: number = position ?? this.editor.state.selection.from;

          return commands.insertContentAt(pos, {
            type: this.name,
            attrs: { annotationData: annotation, uuid: annotation.data.uuid },
          });
        },
    };
  },
});
