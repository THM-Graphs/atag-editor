import { Node, NodeViewRendererProps } from '@tiptap/core';
import { AnnotationData } from '../models/types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    zeroPointAnnotation: {
      setZeroPointAnnotation: (annotation: AnnotationData) => ReturnType;
    };
  }
}

type ZeroPointAttributes = {
  uuid: string;
  annotationData: AnnotationData;
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
            'data-anno-type': attributes.annotationData.properties.type,
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
            'data-uuid': attributes.annotationData.properties.uuid,
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
    return (nodeProps: NodeViewRendererProps) => {
      const elm: HTMLElement = document.createElement('span');
      const annotationType = nodeProps.node.attrs.annotationData.properties.type;

      elm.setAttribute('data-anno-type', annotationType);

      elm.innerHTML = `<?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
  <svg fill="#000000" width="20px" height="20px" viewBox="0 0 24 24" version="1.2" baseProfile="tiny" xmlns="http://www.w3.org/2000/svg"><path d="M12 3c-4.963 0-9 4.038-9 9s4.037 9 9 9 9-4.038 9-9-4.037-9-9-9zm0 16c-3.859 0-7-3.14-7-7s3.141-7 7-7 7 3.14 7 7-3.141 7-7 7zM12.707 12l2.646-2.646c.194-.194.194-.512 0-.707-.195-.194-.513-.194-.707 0l-2.646 2.646-2.646-2.647c-.195-.194-.513-.194-.707 0-.195.195-.195.513 0 .707l2.646 2.647-2.646 2.646c-.195.195-.195.513 0 .707.097.098.225.147.353.147s.256-.049.354-.146l2.646-2.647 2.646 2.646c.098.098.226.147.354.147s.256-.049.354-.146c.194-.194.194-.512 0-.707l-2.647-2.647z"/></svg>`;
      return { dom: elm };
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, test: 'test' }];
  },

  addCommands() {
    return {
      setZeroPointAnnotation:
        (annotation: AnnotationData) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { annotationData: annotation, uuid: annotation.properties.uuid },
          });
          // return commands.insertContent({ type: this.name, attrs: attributes });
        },
    };
  },
});
