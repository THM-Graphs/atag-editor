import { Mark, mergeAttributes } from '@tiptap/vue-3';
import { Annotation } from '../models/types';
export interface AnnotationOptions {
  HTMLAttributes: Record<string, any>;
}

export interface AnnotationAttributes {
  type: string;
  uuid: string;
  subType?: string | number;
  text?: string;
  // Add other flat properties you need
  [key: string]: any;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotation: {
      setAnnotation: (attributes: AnnotationAttributes) => ReturnType;
      unsetAnnotation: () => ReturnType;
    };
  }
}

export const AnnotationMark = Mark.create({
  name: 'annotation',

  inclusive: false,
  excludes: '', // Allow overlapping

  addAttributes() {
    return {
      type: {
        default: null,
        parseHTML: element => element.getAttribute('data-annotation-type'),
        renderHTML: attributes => {
          if (!attributes.type) return {};
          return { 'data-annotation-type': attributes.type };
        },
      },
      uuid: {
        default: null,
        parseHTML: element => element.getAttribute('data-annotation-uuid'),
        renderHTML: attributes => {
          if (!attributes.uuid) return {};
          return { 'data-annotation-uuid': attributes.uuid };
        },
      },
      subType: {
        default: null,
        parseHTML: element => element.getAttribute('data-annotation-subtype'),
        renderHTML: attributes => {
          if (!attributes.subType) return {};
          return { 'data-annotation-subtype': attributes.subType };
        },
      },
      isZeroPoint: {
        default: false,
        parseHTML: element => element.getAttribute('data-zero-point') === 'true',
        renderHTML: attributes => {
          if (!attributes.isZeroPoint) return {};
          return { 'data-zero-point': 'true' };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-annotation-uuid]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const isZeroPoint = HTMLAttributes.isZeroPoint === true;

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: isZeroPoint ? 'annotation zero-point-annotation' : 'annotation',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAnnotation:
        (attributes: AnnotationAttributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetAnnotation:
        (uuid?: string) =>
        ({ commands, state, tr, dispatch }) => {
          if (!uuid) {
            return commands.unsetMark(this.name);
          }

          const { from, to } = state.selection;

          if (dispatch) {
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.isText) {
                node.marks.forEach(mark => {
                  if (mark.type.name === this.name && mark.attrs.uuid === uuid) {
                    tr.removeMark(pos, pos + node.nodeSize, mark);
                  }
                });
              }
            });
          }

          return true;
        },
    };
  },
});

export const HighlightMark = Mark.create({
  name: 'highlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', HTMLAttributes, 0];
  },
});
