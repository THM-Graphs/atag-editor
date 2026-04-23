import { Plugin, PluginKey, Transaction } from '@tiptap/pm/state';
import { Extension } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useGuidelinesStore } from '../store/guidelines';
import { AnnotationData, AnnotationType } from '../models/types';
import { AddAnnotationStep } from './addAnnotationStep';
import { RemoveAnnotationStep } from './removeAnnotationStep';

const { getAnnotationConfig } = useGuidelinesStore();

export const ANNOTATION_DECORATION_KEY = new PluginKey<AnnotationDecorationState>(
  'annotationDecoration',
);

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotationDecoration: {
      addAnnotationDecoration: (annotation: AnnotationData, from: number, to: number) => ReturnType;
      removeAnnotationDecoration: (annotation: AnnotationData) => ReturnType;
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
      addAnnotationDecoration:
        (annotation: AnnotationData, from: number, to: number) =>
        ({ tr, dispatch }) => {
          // Add placeholder step that signals plugin what to execute
          tr.step(new AddAnnotationStep(annotation, from, to));

          dispatch?.(tr);

          return true;
        },

      removeAnnotationDecoration:
        (annotation: AnnotationData) =>
        ({ tr, dispatch, state }) => {
          const pluginState: AnnotationDecorationState | undefined =
            ANNOTATION_DECORATION_KEY.getState(state);

          if (!pluginState) {
            return false;
          }

          // Annotation must be found to be included in the step, since undo and redo need to know
          // what annotation object to (re)create
          const decos: Decoration[] = pluginState.all.find(
            undefined,
            undefined,
            spec => spec._uuid === annotation.properties.uuid,
          );

          if (!decos.length) {
            return false;
          }

          const deco: Decoration = decos[0];

          tr.step(new RemoveAnnotationStep(annotation, deco.from, deco.to));

          dispatch?.(tr);

          return true;
        },

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

          tr.setMeta(ANNOTATION_DECORATION_KEY, meta);

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

          tr.setMeta(ANNOTATION_DECORATION_KEY, meta);

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

          tr.setMeta(ANNOTATION_DECORATION_KEY, meta);

          dispatch?.(tr);

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: ANNOTATION_DECORATION_KEY,
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
            const meta: TransactionMeta = tr.getMeta(ANNOTATION_DECORATION_KEY);

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

            // Handle AddAnnotationStep / RemoveAnnotationStep (and their undo/redo inverses).
            // Because these are actual Steps, the history plugin records and inverts them
            // automatically — no special undo handling needed here.
            let newAll: DecorationSet = oldDecorations.all;
            let decorationsChanged: boolean = false;

            // Loop over transaction steps to discover if any of them are AddAnnotationStep/RemoveAnnotationStep.
            // This would mean the last transaction should add/remove a decoration
            for (const step of tr.steps) {
              if (step instanceof AddAnnotationStep) {
                const { from, to, annotation } = step;

                const newDeco: Decoration = isZeroPoint(annotation)
                  ? createWidgetDecoration(from + 1, annotation)
                  : createInlineDecoration(from, to, annotation);

                newAll = newAll.add(doc, [newDeco]);
                decorationsChanged = true;
              } else if (step instanceof RemoveAnnotationStep) {
                const { annotation } = step;

                const toRemove: Decoration[] = newAll.find(
                  undefined,
                  undefined,
                  spec => spec._uuid === annotation.properties.uuid,
                );
                newAll = newAll.remove(toRemove);
                decorationsChanged = true;
              }
            }

            // Remap all positions for any document changes (typing, deletions, etc.)
            newAll = newAll.map(tr.mapping, doc);

            // Remap stored viewport bounds so the filter window stays accurate after
            // insertions/deletions that shift document positions.
            const newVisibleFrom: number = tr.docChanged
              ? tr.mapping.map(oldDecorations.visibleFrom)
              : oldDecorations.visibleFrom;
            const newVisibleTo: number = tr.docChanged
              ? tr.mapping.map(oldDecorations.visibleTo)
              : oldDecorations.visibleTo;

            let newFiltered: DecorationSet = oldDecorations.filtered;

            if (decorationsChanged || tr.docChanged) {
              /* 
              TODO: Recreation of the "filtered" set might be an overkill, but it works currently. Before, the "filtered" set did not change since
              the drawn HTML would not change completely. However, when a lot of text is removed an new text comes into
              the viewport, it does not have decorations yet - they are only added when a viewportChanged transaction
              was dispatched during scroll. Keep in mind
              */
              newFiltered = createFilteredDecorations(
                newAll,
                { ...oldDecorations, visibleFrom: newVisibleFrom, visibleTo: newVisibleTo },
                tr,
              );
            }

            return {
              ...oldDecorations,
              all: newAll,
              filtered: newFiltered,
              visibleFrom: newVisibleFrom,
              visibleTo: newVisibleTo,
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
