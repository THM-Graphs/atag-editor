import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useGuidelinesStore } from '../store/guidelines';
import { AnnotationData, AnnotationType } from '../models/types';

const { getAnnotationConfig } = useGuidelinesStore();

type TransactionMetaType =
  | 'annotationAdded'
  | 'annotationDeleted'
  | 'docChanged'
  | 'filterUpdated'
  | 'initialize'
  | undefined;

type InitMeta = {
  type: TransactionMetaType;
  annotations: Map<string, AnnotationData>;
};

type AnnotationDecorationState = {
  all: DecorationSet;
  filtered: DecorationSet;
};

// TODO: Implement
function indexToEditorPos(index: number): number {
  return index;
}

function isZeroPoint(annotation: AnnotationData): boolean {
  const config: AnnotationType = getAnnotationConfig(annotation.properties.type);

  if (!config) {
    console.error(
      `The configuration of annotation type "${annotation.properties.tpye} could not be found`,
    );

    return false;
  }

  // TODO: Should the isZeroPoint property of the annotation also (or instead) be included?
  return config.isZeroPoint ? true : false;
}

function createWidgetDecoration(from: number, to: number, annotation: AnnotationData): Decoration {
  // Widget decoration for the comment indicator
  const elm: HTMLSpanElement = document.createElement('span');

  // TODO: Make this also dynamic
  elm.className = 'indicator';
  elm.textContent = '❣';

  // TODO: Is this needed or handled by tiptap?
  elm.style.userSelect = 'false';

  return Decoration.widget(from, elm, {
    side: -1,
    key: `widget-${annotation.properties.uuid}`,
    // ignoreSelection: true,
  });
}

function createInlineDecoration(from: number, to: number, annotation: AnnotationData): Decoration {
  return Decoration.inline(
    from,
    to,
    {
      nodeName: 'span',
      class: '' + annotation.properties.type,
    },
    { inclusiveEnd: true },
  );
}

function createInitialDecorations(annotations: Map<string, AnnotationData>): Decoration[] {
  const decos: Decoration[] = [];

  for (const annotation of annotations.values()) {
    const { startIndex, endIndex } = annotation.properties;

    const start: number = indexToEditorPos(startIndex);
    const end: number = indexToEditorPos(endIndex);

    if (isZeroPoint(annotation)) {
      decos.push(createWidgetDecoration(start, end, annotation));
    } else {
      decos.push(createInlineDecoration(start, end, annotation));
    }
  }

  return decos;
}

export const AnnotationDecoration = Extension.create({
  name: 'annotationDecoration',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey(this.name),
        state: {
          init(): AnnotationDecorationState {
            return {
              all: DecorationSet.empty,
              filtered: DecorationSet.empty,
            };
          },
          apply(tr, value): AnnotationDecorationState {
            const meta: InitMeta | undefined = tr.getMeta('type');

            // On initialization, all decorations need to be created at first
            if (meta?.type === 'initialize') {
              const doc: Node = tr.doc;

              const decos: Decoration[] = createInitialDecorations(meta.annotations);

              const newAll: DecorationSet = DecorationSet.create(doc, decos);
              const newFiltered: DecorationSet = newAll;

              return {
                all: newAll,
                filtered: newFiltered,
              };
            }

            // Remap ALL doc positions if just the document has changed and no custom transaction was dispatched
            const newAll: DecorationSet = value.all.map(tr.mapping, tr.doc);

            // TODO: Apply filter functions
            // Set of to-be-rendered decorations (viewport, annotation type filter etc.)
            const newFiltered: DecorationSet = newAll;

            return {
              all: newAll,
              filtered: newFiltered,
            };
          },
        },
        props: {
          decorations(state) {
            // Only the filtered annotations should be rendered
            return this.getState(state)?.filtered ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
