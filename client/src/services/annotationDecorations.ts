import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { AnnotationData } from '../models/types';
import { useFilterStore } from '../store/filter';

const { selectedOptions } = useFilterStore();
const VIEWPORT_BUFFER_PX = 400;

type AnnotationDecoState = {
  full: DecorationSet; // all annotations — position-tracked, never rendered
  filtered: DecorationSet; // viewport × filter subset — rendered in the view
  visibleFrom: number;
  visibleTo: number;
  selectedTypes: string[];
};

type InitMeta = {
  type: 'init';
  full: DecorationSet;
  visibleFrom: number;
  visibleTo: number;
  selectedTypes: string[];
};
type FilterMeta = { type: 'filter'; selectedTypes: string[] };
type ViewportMeta = { type: 'viewport'; visibleFrom: number; visibleTo: number };

export const annotationDecorationsKey = new PluginKey<AnnotationDecoState>('annotationDecorations');

export const AnnotationDecorations = Extension.create({
  name: 'annotationDecorations',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: annotationDecorationsKey,

        state: {
          init(): AnnotationDecoState {
            return {
              full: DecorationSet.empty,
              filtered: DecorationSet.empty,
              visibleFrom: 0,
              visibleTo: 0,
              selectedTypes: [],
            };
          },

          apply(tr, state): AnnotationDecoState {
            const meta: InitMeta | FilterMeta | ViewportMeta | undefined =
              tr.getMeta(annotationDecorationsKey);

            // console.time('filter please');

            // meta?.full
            //   .find(0, 10000000)
            //   .filter(deco => selectedOptions.value.includes(deco.type.attrs['data-anno-type']));
            // console.timeEnd('filter please');

            if (meta?.type === 'init') {
              const filtered = buildFilteredSet(
                meta.full,
                meta.selectedTypes,
                meta.visibleFrom,
                meta.visibleTo,
                tr.doc,
              );
              return {
                full: meta.full,
                filtered,
                visibleFrom: meta.visibleFrom,
                visibleTo: meta.visibleTo,
                selectedTypes: meta.selectedTypes,
              };
            }

            const newFull = tr.docChanged ? state.full.map(tr.mapping, tr.doc) : state.full;

            if (meta?.type === 'filter') {
              return {
                ...state,
                full: newFull,
                filtered: buildFilteredSet(
                  newFull,
                  meta.selectedTypes,
                  state.visibleFrom,
                  state.visibleTo,
                  tr.doc,
                ),
                selectedTypes: meta.selectedTypes,
              };
            }

            if (meta?.type === 'viewport') {
              console.time('loop');
              console.log(
                newFull.find(0, 1000000).forEach(deco => {
                  const x = deco;
                }),
              );
              console.timeEnd('loop');
              return {
                ...state,
                full: newFull,
                filtered: buildFilteredSet(
                  newFull,
                  state.selectedTypes,
                  meta.visibleFrom,
                  meta.visibleTo,
                  tr.doc,
                ),
                visibleFrom: meta.visibleFrom,
                visibleTo: meta.visibleTo,
              };
            }

            // Regular doc change — remap, keep viewport and filter
            const newFiltered = tr.docChanged
              ? state.filtered.map(tr.mapping, tr.doc)
              : state.filtered;

            return { ...state, full: newFull, filtered: newFiltered };
          },
        },

        props: {
          decorations(state) {
            return annotationDecorationsKey.getState(state)?.filtered ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

/**
 * Builds decoration sets from the full annotation store and dispatches them to the editor.
 * Call once after the editor is initialized and mounted in the DOM (so posAtCoords works).
 */
export function initializeAnnotationDecorations(
  editor: { view: any; state: any },
  annotations: Map<string, AnnotationData>,
  selectedTypes: string[],
): void {
  const { state } = editor;

  const allDecorations = buildDecorationsFromAnnotations(annotations, state.doc);
  const full = DecorationSet.create(state.doc, allDecorations);
  const { from: visibleFrom, to: visibleTo } = getVisibleDocRange(editor.view);

  const meta: InitMeta = { type: 'init', full, visibleFrom, visibleTo, selectedTypes };
  editor.view.dispatch(state.tr.setMeta(annotationDecorationsKey, meta));
}

/**
 * Updates the rendered decorations when the active filter changes.
 */
export function updateAnnotationFilter(
  editor: { view: any; state: any },
  selectedTypes: string[],
): void {
  const meta: FilterMeta = { type: 'filter', selectedTypes };
  editor.view.dispatch(editor.state.tr.setMeta(annotationDecorationsKey, meta));
}

/**
 * Updates the rendered decorations when the visible viewport changes (scroll/resize).
 * Call this from a debounced scroll listener on the editor's container.
 */
export function updateAnnotationViewport(editor: { view: any; state: any }): void {
  console.log('viewport change');
  const { from: visibleFrom, to: visibleTo } = getVisibleDocRange(editor.view);
  const meta: ViewportMeta = { type: 'viewport', visibleFrom, visibleTo };
  editor.view.dispatch(editor.state.tr.setMeta(annotationDecorationsKey, meta));
}

/**
 * Reads current positions from the full DecorationSet and updates
 * startIndex/endIndex on each annotation in the store. Call before saving.
 */
export function syncAnnotationPositions(
  editorState: any,
  annotations: Map<string, AnnotationData>,
): void {
  const pluginState = annotationDecorationsKey.getState(editorState);
  if (!pluginState) return;

  pluginState.full.find().forEach(deco => {
    const uuid = deco.spec['data-anno-uuid'];
    const anno = annotations.get(uuid);

    if (!anno) return;
    if (deco.from === deco.to) return; // collapsed by deletion — skip

    anno.properties.startIndex = indexFromPosition(editorState.doc, deco.from);
    anno.properties.endIndex = indexFromPosition(editorState.doc, deco.to) - 1;
  });
}

function buildDecorationsFromAnnotations(
  annotations: Map<string, AnnotationData>,
  doc: any,
): Decoration[] {
  const decorations: Decoration[] = [];

  annotations.forEach(anno => {
    const { uuid, type, subType, startIndex, endIndex } = anno.properties;

    const from = positionFromIndex(doc, startIndex);
    const to = positionFromIndex(doc, endIndex + 1);

    if (from >= to || from < 0 || to > doc.content.size) return;

    decorations.push(
      Decoration.inline(from, to, {
        class: ['annotation', type, subType].filter(Boolean).join(' '),
        'data-anno-uuid': uuid,
        'data-anno-type': type,
      }),
    );
  });

  return decorations;
}

function buildFilteredSet(
  fullSet: DecorationSet,
  selectedTypes: string[],
  from: number,
  to: number,
  doc: any,
): DecorationSet {
  if (from >= to) return DecorationSet.empty;

  const decos = fullSet
    .find(from, to)
    .filter(deco => selectedTypes.includes(deco.type.attrs['data-anno-type']));

  return DecorationSet.create(doc, decos);
}

/**
 * Computes which ProseMirror positions are currently visible in the browser viewport,
 * with a buffer above and below to avoid decoration pop-in during scrolling.
 */
function getVisibleDocRange(view: any): { from: number; to: number } {
  const rect = view.dom.getBoundingClientRect();
  const docSize = view.state.doc.content.size;

  const topY = Math.max(rect.top, 0) - VIEWPORT_BUFFER_PX;
  const bottomY = Math.min(rect.bottom, window.innerHeight) + VIEWPORT_BUFFER_PX;

  // posAtCoords requires coordinates within the editor's bounding rect
  const clamp = (y: number) => Math.max(rect.top + 1, Math.min(y, rect.bottom - 1));

  const fromResult = view.posAtCoords({ left: rect.left + 1, top: clamp(topY) });
  const toResult = view.posAtCoords({ left: rect.left + 1, top: clamp(bottomY) });

  return {
    from: fromResult?.pos ?? 0,
    to: toResult?.pos ?? docSize,
  };
}

function positionFromIndex(doc: any, index: number): number {
  let remaining = index;
  let pos = 0;

  doc.descendants((node: any, nodePos: number) => {
    if (remaining < 0) return false;

    if (node.isText) {
      if (remaining <= node.text.length) {
        pos = nodePos + remaining;
        remaining = -1;
        return false;
      }
      remaining -= node.text.length;
    }
  });

  return pos;
}

function indexFromPosition(doc: any, pos: number): number {
  let index = 0;
  let found = false;

  doc.descendants((node: any, nodePos: number) => {
    if (found) return false;

    if (node.isText) {
      const nodeEnd = nodePos + node.text.length;
      if (pos >= nodePos && pos <= nodeEnd) {
        index += pos - nodePos;
        found = true;
        return false;
      }
      index += node.text.length;
    }
  });

  return index;
}
