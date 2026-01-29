import { Mark, mergeAttributes } from '@tiptap/vue-3';
import { Annotation } from '../models/types';

export interface AnnotationOptions {
  HTMLAttributes: Record<string, any>;
}

export interface AnnotationAttributes {
  type: string;
  uuid: string;
  subType?: string | number;
  [key: string]: any;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotation: {
      /**
       * Set an annotation mark
       */
      setAnnotation: (newAnnotation: Annotation) => ReturnType;
      /**
       * Unset an annotation mark
       */
      unsetAnnotation: () => ReturnType;
    };
  }
}

export const AnnotationMark = Mark.create<AnnotationOptions>({
  name: 'annotation',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: null,
        parseHTML: element => element.getAttribute('data-annotation-type'),
        renderHTML: (newAnnotation: Annotation) => {
          if (!newAnnotation.data.properties.type) return {};
          return {
            'data-annotation-type': newAnnotation.data.properties.type,
          };
        },
      },
      uuid: {
        default: null,
        parseHTML: element => element.getAttribute('data-annotation-uuid'),
        renderHTML: (newAnnotation: Annotation) => {
          if (!newAnnotation.data.properties.uuid) return {};
          return { 'data-annotation-uuid': newAnnotation.data.properties.uuid };
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
      // Add other annotation properties as needed
    };
  },

  parseHTML() {
    console.log(this);
    return [
      {
        tag: 'span[data-annotation-type]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    console.log('create');

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'annotation',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAnnotation:
        newAnnotation =>
        ({ commands }) => {
          return commands.setMark(this.name, newAnnotation);
        },
      unsetAnnotation:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
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
