import { Plugin, PluginKey, Transaction } from '@tiptap/pm/state';
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
  type: 'initialize';
  annotations: Map<string, AnnotationData>;
  selectedTypes: string[];
};

type FilterUpdateMeta = {
  type: 'filterUpdated';
  selectedTypes: string[];
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
  elm.dataset.uuid = annotation.properties.uuid;

  // TODO: Is this needed or handled by tiptap?
  elm.style.userSelect = 'false';

  return Decoration.widget(from, elm, {
    side: -1,
    key: `widget-${annotation.properties.uuid}`,
    // ignoreSelection: true,
    _type: annotation.properties.type,
    _uuid: annotation.properties.uuid,
  });
}

function createInlineDecoration(from: number, to: number, annotation: AnnotationData): Decoration {
  return Decoration.inline(
    from,
    to,
    {
      nodeName: 'span',
      class: [annotation.properties.type, annotation.properties.subType].filter(Boolean).join(' '),
      'data-uuid': annotation.properties.uuid,
    },
    { inclusiveEnd: true, _type: annotation.properties.type, _uuid: annotation.properties.uuid },
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

function createFilteredDecorations(
  decorationSet: DecorationSet,
  filterOptions: {
    selectedTypes: string[];
  },
  tr: Transaction,
): DecorationSet {
  const { doc } = tr;
  const { selectedTypes } = filterOptions;

  // TODO: Implement filter
  const filteredDecorations: Decoration[] = decorationSet
    .find(0, Number.MAX_SAFE_INTEGER)
    .filter(decoration => selectedTypes.includes(decoration.spec._type));

  return DecorationSet.create(doc, filteredDecorations);
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
            const doc: Node = tr.doc;
            const meta: InitMeta | FilterUpdateMeta | undefined = tr.getMeta('type');

            // On initialization, all decorations need to be created at first
            if (meta?.type === 'initialize') {
              const decos: Decoration[] = createInitialDecorations(meta.annotations);

              const newAll: DecorationSet = DecorationSet.create(doc, decos);
              const newFiltered: DecorationSet = createFilteredDecorations(
                newAll,
                { selectedTypes: meta.selectedTypes },
                tr,
              );

              return {
                all: newAll,
                filtered: newFiltered,
              };
            } else if (meta?.type === 'filterUpdated') {
              const newAll: DecorationSet = value.all.map(tr.mapping, tr.doc);

              // Set of to-be-rendered decorations (viewport, annotation type filter etc.)
              const newFiltered: DecorationSet = createFilteredDecorations(
                newAll,
                { selectedTypes: meta.selectedTypes },
                tr,
              );

              return {
                all: newAll,
                filtered: newFiltered,
              };
            }

            // If just content changed:
            // Remap ALL doc positions since no custom transaction was dispatched
            const newAll: DecorationSet = value.all.map(tr.mapping, tr.doc);
            const newFiltered: DecorationSet = tr.docChanged
              ? value.filtered.map(tr.mapping, tr.doc)
              : value.filtered;

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
