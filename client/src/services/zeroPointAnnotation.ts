import { Mark } from '@tiptap/core';
import { Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    zeroPointAnnotation: {
      setZeroPointAnnotation: (attributes: AnnotationMarkAttributes) => ReturnType;
    };
  }
}

type AnnotationMarkAttributes = {
  uuid: string;
  type: string;
  subType?: string | number;
  isZeroPoint: boolean;
};

export const ZeroPointAnnotation = Node.create({
  name: 'zeroPointAnnotation',
  group: 'inline',
  inline: true,
  atom: true,

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

  // TODO: Do this later maybe...
  //   addNodeView() {
  //     return () => {
  //       const dom = document.createElement('span');

  //       dom.innerHTML = `<?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
  // <svg fill="#000000" width="20px" height="20px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M12 3c-4.963 0-9 4.038-9 9s4.037 9 9 9 9-4.038 9-9-4.037-9-9-9zm0 16c-3.859 0-7-3.14-7-7s3.141-7 7-7 7 3.14 7 7-3.141 7-7 7zM12.707 12l2.646-2.646c.194-.194.194-.512 0-.707-.195-.194-.513-.194-.707 0l-2.646 2.646-2.646-2.647c-.195-.194-.513-.194-.707 0-.195.195-.195.513 0 .707l2.646 2.647-2.646 2.646c-.195.195-.195.513 0 .707.097.098.225.147.353.147s.256-.049.354-.146l2.646-2.647 2.646 2.646c.098.098.226.147.354.147s.256-.049.354-.146c.194-.194.194-.512 0-.707l-2.647-2.647z"/></svg>`;
  //       return { dom };
  //     };
  //   },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, test: 'test' }];
  },

  addCommands() {
    return {
      setZeroPointAnnotation:
        (attributes: AnnotationMarkAttributes) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: attributes });
          // return commands.insertContent({ type: this.name, attrs: attributes });
        },
    };
  },
});
