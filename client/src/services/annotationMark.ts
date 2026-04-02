import { Mark } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotation: {
      setAnnotation: (attributes: AnnotationMarkAttributes) => ReturnType;
    };
  }
}

type AnnotationMarkAttributes = {
  uuid: string;
  type: string;
  subType?: string | number;
  isZeroPoint: boolean;
};

export const AnnotationMark = Mark.create({
  name: 'annotation',
  //   I am not sure about this
  inclusive: true,
  // Allow overlaps
  excludes: '',

  addOptions() {
    return {};
  },

  addAttributes(): Record<keyof AnnotationMarkAttributes, any> {
    return {
      uuid: {
        default: null,
        keepOnSplit: true,
        isRequired: true,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-anno-uuid'),
        renderHTML: (attributes: AnnotationMarkAttributes) => {
          return {
            'data-anno-uuid': attributes.uuid,
          };
        },
      },
      type: {
        default: null,
        keepOnSplit: true,
        isRequired: true,
        parseHTML: (element: HTMLElement) => {
          const annotationClass: string = [...element.classList].find(cls => cls === this.name);

          return annotationClass;
        },
        renderHTML: (attributes: AnnotationMarkAttributes) => {
          return {
            class: attributes.type,
          };
        },
      },
      subType: {
        default: null,
        keepOnSplit: true,
        isRequired: false,
        parseHTML: (element: HTMLElement) => {
          const annotationClass: string =
            [...element.classList].find(cls => cls === this.name) ?? '';

          return annotationClass;
        },
        renderHTML: (attributes: AnnotationMarkAttributes) => {
          return {
            class: attributes.subType ?? '',
          };
        },
      },
      isZeroPoint: {
        default: false,
        keepOnSplit: true,
        isRequired: true,
        parseHTML: (element: HTMLElement) => {
          const annotationClass: string = [...element.classList].find(cls => cls === this.name);

          return annotationClass;
        },
        renderHTML: (attributes: AnnotationMarkAttributes) => {
          return {
            class: attributes.isZeroPoint,
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

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setAnnotation:
        (attributes: AnnotationMarkAttributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
    };
  },
});
