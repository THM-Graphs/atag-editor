import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { AnnotationData } from '../models/types';

function createInitialRangeDecorations(annotations: AnnotationData[]): Decoration[] {
  const decos: Decoration[] = [];

  for (const annotation of annotations) {
    const { startIndex, endIndex } = annotation.properties;

    const decoration = Decoration.inline(
      startIndex,
      endIndex,
      {
        nodeName: 'span',
        class: '' + annotation.properties.type,
      },
      { inclusiveEnd: true },
    );

    decos.push(decoration);
  }

  // console.log('on create:', decos);

  return decos;
}

export const AnnotationDecoration = Extension.create({
  name: 'annotationDecoration',

  addOptions() {
    return {
      initialAnnotations: [],
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('annotationDecoration'),
        state: {
          init: (config, instance) => {
            const doc = instance.doc;

            const decos = createInitialRangeDecorations(this.options.initialAnnotations);

            console.log(this.options.initialAnnotations);

            return DecorationSet.empty;

            return DecorationSet.create(doc, decos);
          },
          apply: (tr, decorations, oldState, newState) => {
            console.log('apply');
            const decos = createInitialRangeDecorations(this.options.initialAnnotations);
            return DecorationSet.create(tr.doc, decos);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
        view(view) {
          return {
            update() {
              //   console.log('Custom plugin updated');
            },
          };
        },
      }),
    ];
  },
});
