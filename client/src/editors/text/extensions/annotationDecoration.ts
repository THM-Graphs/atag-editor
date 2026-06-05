import { Plugin, PluginKey, Transaction, EditorState } from '@tiptap/pm/state';
import { Mapping } from '@tiptap/pm/transform';
import { Extension } from '@tiptap/core';
import { Node } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useGuidelinesStore } from '../../../store/guidelines';
import { AddAnnotationStep } from '../steps/addAnnotationStep';
import { AnnotationNode, NodeStatusObject } from '../../../models/types';
import { RemoveAnnotationStep } from '../steps/removeAnnotationStep';
import { indexToPosition } from '../../../utils/helper/indexHelper';

const { isZeroPoint } = useGuidelinesStore();

export const ANNOTATION_DECORATION_KEY = new PluginKey<AnnotationDecorationState>(
  'annotationDecoration',
);

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotationDecoration: {
      addAnnotationDecoration: (annotation: AnnotationNode, from: number, to: number) => ReturnType;
      removeAnnotationDecoration: (annotation: AnnotationNode) => ReturnType;
      initializeDecorations: (
        annotations: Map<string, NodeStatusObject<AnnotationNode>>,
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
  annotations: Map<string, AnnotationNode>;
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

type AnnotationDecorationSpec = {
  _type: string;
  _uuid: string;
};

function createDecoration(from: number, to: number, annotation: AnnotationNode): Decoration {
  return Decoration.inline(
    from,
    to,
    {
      nodeName: 'span',
      class: [annotation.data.type, annotation.data.subType].filter(Boolean).join(' '),
      'data-anno-uuid': annotation.data.uuid,
    },
    { inclusiveEnd: true, _type: annotation.data.type, _uuid: annotation.data.uuid },
  );
}

function createInitialDecorations(
  doc: Node,
  annotations: Map<string, AnnotationNode>,
): Decoration[] {
  const decos: Decoration[] = [];

  for (const annotation of [...annotations.values()].toSorted(
    (a, b) => a.data.startIndex - b.data.startIndex,
  )) {
    const { startIndex, endIndex } = annotation.data;

    const start: number = indexToPosition(doc, startIndex);
    const end: number = indexToPosition(doc, endIndex + 1);

    decos.push(createDecoration(start, end, annotation));
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

  const filteredDecorations: Decoration[] = decorationSet.find(
    visibleFrom,
    visibleTo,
    (spec: AnnotationDecorationSpec) => selectedTypes.includes(spec._type),
  );

  return DecorationSet.create(doc, filteredDecorations);
}

export const AnnotationDecoration = Extension.create({
  name: 'annotationDecoration',

  addOptions() {
    return {
      getAnnotationByUuid: (_uuid: string): AnnotationNode | undefined => undefined,
    };
  },

  addCommands() {
    return {
      addAnnotationDecoration:
        (annotation: AnnotationNode, from: number, to: number) =>
        ({ tr, dispatch }) => {
          // Add placeholder step that signals plugin what to execute
          tr.step(new AddAnnotationStep(annotation, from, to));

          dispatch?.(tr);

          return true;
        },

      removeAnnotationDecoration:
        (annotation: AnnotationNode) =>
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
            (spec: AnnotationDecorationSpec) => spec._uuid === annotation.data.uuid,
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
          annotations: Map<string, NodeStatusObject<AnnotationNode>>,
          selectedTypes: string[],
          visibleFrom: number,
          visibleTo: number,
        ) =>
        ({ tr, dispatch }) => {
          // TODO: Or should this be filtered outside the plugin?
          const filtered = new Map<string, AnnotationNode>();

          for (const [uuid, { node }] of annotations) {
            if (!isZeroPoint(node)) {
              filtered.set(uuid, node);
            }
          }

          const meta: InitMeta = {
            type: 'initialize',
            annotations: filtered,
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
    const { getAnnotationByUuid } = this.options;

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

            // Map first so existing decorations move into post-transaction coordinate space.
            // AddAnnotationStep positions (including those from undo of eviction) are in
            // post-transaction space and must be added after this remap, not before.
            newAll = newAll.map(tr.mapping, doc);

            // Loop over transaction steps to discover if any of them are AddAnnotationStep/RemoveAnnotationStep.
            for (const step of tr.steps) {
              if (step instanceof AddAnnotationStep) {
                const { from, to, annotation } = step;

                const newDeco: Decoration = createDecoration(from, to, annotation);

                newAll = newAll.add(doc, [newDeco]);
                decorationsChanged = true;
              } else if (step instanceof RemoveAnnotationStep) {
                const { annotation } = step;

                const toRemove: Decoration[] = newAll.find(
                  undefined,
                  undefined,
                  spec => spec._uuid === annotation.data.uuid,
                );
                newAll = newAll.remove(toRemove);
                decorationsChanged = true;
              }
            }

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

        appendTransaction(
          transactions: readonly Transaction[],
          oldState: EditorState,
          newState: EditorState,
        ): Transaction | null {
          // Undo/redo transactions are handled by history replaying the steps we
          // already emitted — re-running detection here would misread those
          // corrections as new changes and emit spurious counter-steps.
          if (
            transactions.some(
              tr => tr.getMeta('uiEvent') === 'undo' || tr.getMeta('uiEvent') === 'redo',
            )
          ) {
            console.log('undo/redo detected...');
            return null;
          }

          // Only perform calculations when the document actually changed
          if (!transactions.some(tr => tr.docChanged)) {
            return null;
          }

          const oldPluginState = ANNOTATION_DECORATION_KEY.getState(oldState);
          const newPluginState = ANNOTATION_DECORATION_KEY.getState(newState);

          if (!oldPluginState || !newPluginState) {
            console.error('Old or new plugin state not found');

            return null;
          }

          // UUIDS by annotations that were explicitly removed and are already handled in the apply() section —
          // These are intentional user removals, no partial/complete deletions by text operations.
          const explicitlyRemovedUuids = new Set<string>(
            transactions
              .flatMap(tr => tr.steps)
              .filter((step): step is RemoveAnnotationStep => step instanceof RemoveAnnotationStep)
              .map(step => step.annotation.data.uuid),
          );

          // Create maps (faster/easier to compare)
          const oldDecoMap = new Map<string, Decoration>(
            oldPluginState.all.find().map(d => [(d.spec as AnnotationDecorationSpec)._uuid, d]),
          );
          const newDecoMap = new Map<string, Decoration>(
            newPluginState.all.find().map(d => [(d.spec as AnnotationDecorationSpec)._uuid, d]),
          );

          // Compose all mappings that happened in the transactions so far so we can test whether individual
          // decoration boundaries landed inside a deleted range.
          const composedMapping: Mapping = new Mapping();

          for (const t of transactions) {
            composedMapping.appendMapping(t.mapping);
          }

          // Create new Transaction object
          const tr: Transaction = newState.tr;

          for (const [uuid, oldDeco] of oldDecoMap) {
            // Skip explicitly removed UUIDs, they are handled in the apply() section
            if (explicitlyRemovedUuids.has(uuid)) {
              continue;
            }

            // TODO: This is technically not important since the annotation data are not stored in the decoration.
            // Should be removed along with all annotation data in the custom step classes, the tiptap config etc.
            const annotation: AnnotationNode | undefined = getAnnotationByUuid(uuid);

            if (!annotation) {
              continue;
            }

            const newDeco: Decoration | undefined = newDecoMap.get(uuid);

            if (!newDeco) {
              // Completely removed by a delete operations — add Remove step so history can
              // invert it to Add on undo, restoring the decoration with the text.
              tr.step(new RemoveAnnotationStep(annotation, oldDeco.from, oldDeco.to));
            } else if (
              composedMapping.mapResult(oldDeco.from, 1).deleted ||
              composedMapping.mapResult(oldDeco.to, -1).deleted
            ) {
              // A boundary was clipped (landed inside a deleted range and snapped
              // to the deletion start). Pure shifts — deletions entirely before the
              // decoration — have deleted=false for both endpoints and are skipped.
              // Add Remove(old) + Add(new) steps so history records the exact range
              // change. On undo, the inverse steps Remove(new) + Add(old) run
              // inside apply() (map-first order): the wrong-mapped decoration is
              // removed by UUID, then the original range is re-added at positions
              // that are valid again in the restored doc.
              tr.step(new RemoveAnnotationStep(annotation, oldDeco.from, oldDeco.to));
              tr.step(new AddAnnotationStep(annotation, newDeco.from, newDeco.to));
            }
          }

          return tr.steps.length > 0 ? tr : null;
        },
      }),
    ];
  },
});
