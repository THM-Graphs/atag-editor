import { Plugin, PluginKey, Transaction } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useGuidelinesStore } from '../store/guidelines';
import { AnnotationData, AnnotationType } from '../models/types';

const { getAnnotationConfig } = useGuidelinesStore();

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotationDecoration: {
      initializeDecorations: (
        annotations: Map<string, AnnotationData>,
        selectedTypes: string[],
        visibleFrom: number,
        visibleTo: number,
      ) => ReturnType;
      applyFilterUpdates: (selectedTypes: string[]) => ReturnType;
      applyViewportUpdates: (docRange: { from: number; to: number }) => ReturnType;
    };
  }
}

type AnnotationDecorationState = {
  all: DecorationSet;
  filtered: DecorationSet;
  visibleFrom: number;
  visibleTo: number;
  selectedTypes: string[];
};

type TransactionMeta = InitMeta | FilterUpdateMeta | ViewportMeta | undefined;

type InitMeta = {
  type: 'initialize';
  annotations: Map<string, AnnotationData>;
  visibleFrom: number;
  visibleTo: number;
  selectedTypes: string[];
};

type FilterUpdateMeta = {
  type: 'filterUpdated';
  selectedTypes: string[];
};

type ViewportMeta = {
  type: 'viewportChanged';
  visibleFrom: number;
  visibleTo: number;
};

function indexToPosition(doc: Node, index: number): number {
  let remaining: number = index;
  let pos: number = 0;

  doc.descendants((node: Node, nodePos: number) => {
    // Position already found, do not further descend into the node subtree
    if (remaining < 0) {
      return false;
    }

    if (node.isText) {
      // Count characters in text node. If annotation index is inside it, return its position. Else,
      // subtract the number of characters in the text node from the remaining index.
      if (remaining <= node.text!.length) {
        pos = nodePos + remaining;
        remaining = -1;

        return false;
      }

      remaining -= node.text!.length;
    }
  });

  return pos;
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

function createWidgetDecoration(after: number, annotation: AnnotationData): Decoration {
  // Widget decoration for the comment indicator
  const elm: HTMLSpanElement = document.createElement('span');

  // TODO: Make this also dynamic
  elm.className = 'indicator';
  elm.textContent = '❣';
  elm.dataset.uuid = annotation.properties.uuid;

  // TODO: Is this needed or handled by tiptap?
  elm.style.userSelect = 'false';

  return Decoration.widget(after, elm, {
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

function createInitialDecorations(
  doc: Node,
  annotations: Map<string, AnnotationData>,
): Decoration[] {
  const decos: Decoration[] = [];

  for (const annotation of [...annotations.values()].toSorted(
    (a, b) => a.properties.startIndex - b.properties.startIndex,
  )) {
    const { startIndex, endIndex } = annotation.properties;

    const start: number = indexToPosition(doc, startIndex);
    const end: number = indexToPosition(doc, endIndex + 1);

    if (isZeroPoint(annotation)) {
      decos.push(createWidgetDecoration(start + 1, annotation));
    } else {
      decos.push(createInlineDecoration(start, end, annotation));
    }
  }

  return decos;
}

function createFilteredDecorations(
  decorationSet: DecorationSet,
  filters: {
    selectedTypes: string[];
    visibleFrom: number;
    visibleTo: number;
  },
  tr: Transaction,
): DecorationSet {
  const { doc } = tr;
  const { selectedTypes, visibleFrom, visibleTo } = filters;

  // TODO: The spec should be typed, very annoying
  const filteredDecorations: Decoration[] = decorationSet.find(visibleFrom, visibleTo, spec =>
    selectedTypes.includes(spec._type),
  );

  return DecorationSet.create(doc, filteredDecorations);
}

export const AnnotationDecoration = Extension.create({
  name: 'annotationDecoration',

  addCommands() {
    return {
      initializeDecorations:
        (
          annotations: Map<string, AnnotationData>,
          selectedTypes: string[],
          visibleFrom: number,
          visibleTo: number,
        ) =>
        ({ tr, dispatch }) => {
          const meta: InitMeta = {
            type: 'initialize',
            annotations: annotations,
            selectedTypes,
            visibleFrom,
            visibleTo,
          };

          tr.setMeta(this.name, meta);

          dispatch?.(tr);

          return true;
        },

      applyFilterUpdates:
        (selectedTypes: string[]) =>
        ({ tr, dispatch }) => {
          const meta: FilterUpdateMeta = {
            type: 'filterUpdated',
            selectedTypes,
          };

          tr.setMeta(this.name, meta);

          dispatch?.(tr);

          return true;
        },

      applyViewportUpdates:
        (docRange: { from: number; to: number }) =>
        ({ tr, dispatch }) => {
          const { from, to } = docRange;

          const meta: ViewportMeta = {
            type: 'viewportChanged',
            visibleFrom: from,
            visibleTo: to,
          };

          tr.setMeta(this.name, meta);

          dispatch?.(tr);

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey(this.name),
        state: {
          init(): AnnotationDecorationState {
            // Return empty state object at plugin initialization. Initial data are inserted with a custom 'initialization'
            // transaction. The reason for this is that during setup phase there are multiple transactions running
            // in the editor which might override the initial state.
            return {
              all: DecorationSet.empty,
              filtered: DecorationSet.empty,
              selectedTypes: [],
              visibleFrom: 0,
              visibleTo: 0,
            };
          },

          apply(tr, oldDecorations): AnnotationDecorationState {
            const doc: Node = tr.doc;
            const meta: TransactionMeta = tr.getMeta('annotationDecoration');

            // On initialization, all decorations need to be created at first
            if (meta?.type === 'initialize') {
              const decos: Decoration[] = createInitialDecorations(doc, meta.annotations);

              const newAll: DecorationSet = DecorationSet.create(doc, decos);
              const newFiltered: DecorationSet = createFilteredDecorations(
                newAll,
                {
                  selectedTypes: meta.selectedTypes,
                  visibleFrom: meta.visibleFrom,
                  visibleTo: meta.visibleTo,
                },
                tr,
              );

              return {
                all: newAll,
                filtered: newFiltered,
                selectedTypes: meta.selectedTypes,
                visibleFrom: meta.visibleFrom,
                visibleTo: meta.visibleTo,
              };
            } else if (meta?.type === 'filterUpdated') {
              const newAll: DecorationSet = oldDecorations.all.map(tr.mapping, tr.doc);

              // Set of to-be-rendered decorations (viewport, annotation type filter etc.)
              const newFiltered: DecorationSet = createFilteredDecorations(
                newAll,
                {
                  ...oldDecorations,
                  selectedTypes: meta.selectedTypes,
                },
                tr,
              );

              return {
                ...oldDecorations,
                selectedTypes: meta.selectedTypes,
                all: newAll,
                filtered: newFiltered,
              };
            } else if (meta?.type === 'viewportChanged') {
              const newAll: DecorationSet = oldDecorations.all.map(tr.mapping, tr.doc);

              // Set of to-be-rendered decorations (viewport, annotation type filter etc.)
              const newFiltered: DecorationSet = createFilteredDecorations(
                newAll,
                {
                  selectedTypes: oldDecorations.selectedTypes,
                  visibleFrom: meta.visibleFrom,
                  visibleTo: meta.visibleTo,
                },
                tr,
              );

              return {
                ...oldDecorations,
                visibleFrom: meta.visibleFrom,
                visibleTo: meta.visibleTo,
                all: newAll,
                filtered: newFiltered,
              };
            }

            // If just content changed:
            // Remap ALL doc positions since no custom transaction was dispatched
            const newAll: DecorationSet = oldDecorations.all.map(tr.mapping, tr.doc);
            const newFiltered: DecorationSet = tr.docChanged
              ? oldDecorations.filtered.map(tr.mapping, tr.doc)
              : oldDecorations.filtered;

            return {
              ...oldDecorations,
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
