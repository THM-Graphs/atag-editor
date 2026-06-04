<script setup lang="ts">
import { ComputedRef, computed, onUnmounted, ref, toValue, watch } from 'vue';
import {
  RouteLocationNormalizedLoaded,
  useRoute,
  onBeforeRouteUpdate,
  onBeforeRouteLeave,
} from 'vue-router';
import { EditorContent } from '@tiptap/vue-3';
import { useEventListener, useTitle } from '@vueuse/core';
import NewEditorAnnotationPanel from '../components/NewEditorAnnotationPanel.vue';
import EditorSidebar from '../components/EditorSidebar.vue';
import EditorHeader from '../components/EditorHeader.vue';
import EditorActionButtonsPane from '../components/EditorActionButtonsPane.vue';
import EditorAnnotations from '../components/EditorAnnotations.vue';
import EditorError from '../components/EditorError.vue';
import EditorFilter from '../components/EditorFilter.vue';
import EditorResizer from '../components/EditorResizer.vue';
import EditorMetadata from '../components/EditorMetadata.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import Message from 'primevue/message';
import {
  NodeDto,
  IndexMap,
  PropertyConfig,
  TextAccessObject,
  Annotation,
  Node,
  NodeStatusObject,
  EntityNode,
  TextNode,
  CollectionNode,
  AnnotationNode,
  BaseNodeData,
  TextUpdateDto,
  NodeStatus,
} from '../models/types';
import { useEditorStore } from '../store/editor';
import { useShortcutsStore } from '../store/shortcuts';
import { useTextStore } from '../store/text';
import { useAppStore } from '../store/app';
import PageOverlay from '../components/PageOverlay.vue';
import { useTiptapStore } from '../store/tiptap';
import EditorAnnotationButtonPaneNew from '../components/EditorAnnotationButtonPaneNew.vue';
import { Node as DocNode } from '@tiptap/pm/model';
import { cloneDeep } from '../utils/helper/helper';
import { useCreateIndexMaps } from '../composables/useCreateIndexMaps';
import { useGuidelinesStore } from '../store/guidelines';
import { IAnnotation } from '../models/IAnnotation';
import EditorToC from '../components/EditorToC.vue';

interface SidebarConfig {
  isCollapsed: boolean;
  resizerActive: boolean;
  width: number;
}
const route: RouteLocationNormalizedLoaded = useRoute();
const textUuid = computed<string>(() => route.params.uuid as string);

const {
  annotations,
  initialStructuralAnnotations,
  initialAnnotations,
  tiptap,
  destroyTiptap,
  hasUnsavedChanges,
  initializeTiptap,
  resetToInitialState,
  setNewInitialState,
} = useTiptapStore();

const { getStructuralAnnotationConfig } = useGuidelinesStore();

onUnmounted(() => destroyTiptap());

onBeforeRouteUpdate(() => preventUserFromRouteLeaving());
onBeforeRouteLeave(() => preventUserFromRouteLeaving());

useEventListener('mouseup', handleMouseUp);
useEventListener('mousedown', handleMouseDown);
useEventListener('beforeunload', handleBeforeUnload);
useEventListener('keydown', handleKeyDown);

// Initial page load
const isLoading = ref<boolean>(true);
const isValidText = computed<boolean>(() => !textFetchError.value);

// For fetch during save/cancel action
const asyncOperationRunning = ref<boolean>(false);

const { api, addToastMessage } = useAppStore();

const { isRedrawMode, redrawMode, toggleRedrawMode } = useEditorStore();
const { error: textFetchError, text, initialText, fetchAndInitializeText } = useTextStore();
// const {
//   afterEndIndex,
//   beforeStartIndex,
//   error: charactersFetchError,
//   initialAfterEndCharacter,
//   initialBeforeStartCharacter,
//   initialSnippetCharacters,
//   snippetCharacters,
//   totalCharacters,
//   fetchAndInitializeCharacters,
//   insertSnippetIntoChain,
//   resetCharacters,
//   resetInitialBoundaryCharacters,
// } = useCharactersStore();
// const {
//   error: annotationFetchError,
//   initialSnippetAnnotations,
//   initialTotalAnnotations,
//   snippetAnnotations,
//   totalAnnotations,
//   extractSnippetAnnotations,
//   fetchAndInitializeAnnotations,
//   insertSnippetIntoTotalAnnotations,
//   getAnnotationsToSave,
//   resetAnnotations,
//   updateAnnotationsBeforeSave,
//   updateAnnotationStatuses,
//   updateTruncationStatus,
// } = useAnnotationStore();
const { shortcutMap, normalizeKeys } = useShortcutsStore();

useTitle(computed(() => `Text | ${text.value?.nodeLabels.join(', ') ?? ''}`));

const resizerWidth = 5;

const mainWidth: ComputedRef<number> = computed(() => {
  const leftSidebarWidth: number = sidebars.value.left.isCollapsed ? 0 : sidebars.value.left.width;
  const rightSidebarWidth: number = sidebars.value.right.isCollapsed
    ? 0
    : sidebars.value.right.width;
  return window.innerWidth - leftSidebarWidth - rightSidebarWidth - resizerWidth * 2;
});

const sidebars = ref<Record<string, SidebarConfig>>({
  left: {
    isCollapsed: false,
    resizerActive: false,
    width: 350,
  },
  right: {
    isCollapsed: false,
    resizerActive: false,
    width: 350,
  },
});

const activeResizer = ref<string>('');
const metadataRef = ref(null);
const labelInputRef = ref(null);
const editorRef = ref<HTMLDivElement>(null);

function cleanUpAfterSave(
  updatedText: NodeStatusObject<TextNode>,
  updatedAnnotations: { annotations: Annotation[]; structureElements: Annotation[] },
): void {
  text.value = cloneDeep(updatedText.node);

  cleanUpAnnotations(updatedAnnotations.annotations);
  cleanUpStructureElements(updatedAnnotations.structureElements);

  setNewInitialState();
}

function cleanUpAnnotations(updatedAnnotations: NodeStatusObject[]): void {
  updatedAnnotations.forEach(a => {
    if (a.meta.status === 'deleted') {
      // Can be removed from the map safely
      annotations.value?.delete(a.node.data.uuid);
    } else {
      // Recursively set all nodes to "unchanged"
      traverseNodeTreeAndSetToCreated(a);

      // Update value
      annotations.value?.set(a.node.data.uuid, a as Annotation);
    }
  });

  // Reset
  initialAnnotations.value = cloneDeep(annotations.value);
}

function cleanUpStructureElements(structureElements: NodeStatusObject[]): void {
  structureElements.forEach((elm: NodeStatusObject) => {
    const uuid: string = elm.node.data.uuid;

    if (elm.meta.status === 'deleted') {
      // Can be removed from the map safely
      initialStructuralAnnotations.value?.delete(uuid);
    } else {
      // Recursively set all nodes to "unchanged". Technically, this is currently not necessary
      // since the structure elements can not have any connected nodes.
      traverseNodeTreeAndSetToCreated(elm);

      // Update value
      initialStructuralAnnotations.value?.set(uuid, elm as Annotation);
    }
  });

  // const docNodes = new Map<string, DocNode>();

  // tiptap.value?.state.doc.descendants(node => {
  //   if (isStructureElement(node)) {
  //     docNodes.set(node.attrs.uuid, node);
  //   }
  // });

  // console.log(docNodes);
  // console.log(initialStructuralAnnotations.value);
  // Reset
}

/**
 * Checks if a node is a structure element editor-wise, meaning that it is either a block element that contains text or other block elmements
 * (div, paragraph) or a `hardBreak`.
 *
 * @param {DocNode} node - Tiptap node to be checked
 */
function isStructureElement(node: DocNode): boolean {
  if (node.type.isBlock || node.type.name === 'hardBreak') {
    return true;
  }

  return false;
}

function getEmptyNodes(): DocNode[] {
  const emptyNodes: DocNode[] = [];

  tiptap.value!.state.doc.descendants((node: DocNode) => {
    if (node.type.name === 'zeroPointAnnotation' || node.type.name === 'hardBreak') {
      return false;
    }

    if (!node.isText && node.textContent === '') {
      emptyNodes.push(node);
      return false;
    }
  });

  return emptyNodes;
}

function findChangedAnnotations(indexMap: IndexMap, plainText: string): Annotation[] {
  const affectedAnnos: Annotation[] = [];

  // Loop through annotations currently in the editor
  indexMap.forEach((value, uuid) => {
    const currentEntry: Annotation | undefined = annotations.value?.get(uuid);
    const initialEntry: Annotation | undefined = initialAnnotations.value?.get(uuid);

    // Should not happen actually
    if (!currentEntry) {
      console.error(`The annotation with uuid ${uuid} could not be found`);
      return;
    }

    const { startIndex, endIndex } = value;
    const textSlice: string = plainText.slice(startIndex, endIndex + 1);

    const hasNewStart: boolean = !initialEntry || initialEntry.node.data.startIndex !== startIndex;
    const hasNewEnd: boolean = !initialEntry || initialEntry.node.data.endIndex !== endIndex;
    const hasChangedText: boolean = !initialEntry || initialEntry.node.data.text !== textSlice;
    const isEditedOrDeleted: boolean = ['created', 'deleted', 'modified'].includes(
      currentEntry.meta.status,
    );

    if (hasNewStart || hasNewEnd || hasChangedText || isEditedOrDeleted) {
      // Needs to be cloned object to keep editor data clean. Otherwise, a failed operation would make problems
      // ("status" field is updated, doc history not clean etc.)
      const cloned: Annotation = cloneDeep(currentEntry);

      // Apply indices to cloned object (for existing or new annotations)
      if (hasNewStart || currentEntry.meta.status === 'created') {
        cloned.node.data.startIndex = value.startIndex;
      }

      if (hasNewEnd || currentEntry.meta.status === 'created') {
        cloned.node.data.endIndex = value.endIndex;
      }

      // Get slice of plain text
      cloned.node.data.text = textSlice;

      // Update status explicitly for changed indices. Otherwised changed/added/deleted annotations keep their status
      if (currentEntry.meta.status !== 'created' && (hasNewStart || hasNewEnd)) {
        cloned.meta.status = 'modified';
      }

      affectedAnnos.push(cloned);
    }
  });

  // Get elements which are deleted in editor
  const uuidsInEditor = new Set<string>([...indexMap.keys()]);
  const initialUuids = new Set<string>([...(initialAnnotations.value?.keys() ?? [])]);
  const deletedUuids = initialUuids.difference(uuidsInEditor);

  deletedUuids.forEach(uuid => {
    const annoEntry: Annotation = initialAnnotations.value?.get(uuid)!;

    const cloned: Annotation = { ...cloneDeep(annoEntry), meta: { status: 'deleted' } };

    affectedAnnos.push(cloned);
  });

  return affectedAnnos;
}

function getConfiguredNodeAttrs(node: DocNode, _tiptapType: string) {
  // Base: all neo4j data stored in _annotationData at load time (uuid, type, custom properties, …)
  const neo4jProperties: Record<string, any> = {};

  // 1. retrieve configured attributes from node (e.g. not "data-toc-id" or anything editor related)
  const fields: PropertyConfig[] =
    getStructuralAnnotationConfig(node.attrs._type)?.properties ?? [];

  fields.forEach((field: PropertyConfig) => {
    if (field.name in node.attrs._annotationData) {
      neo4jProperties[field.name] = node.attrs._annotationData[field.name];
    }
  });

  // 2. Override properties that are handled by tiptap

  // UUID is managed by the UniqueID extension — this is authoritative after
  // any tiptap operations (e.g. copy-paste that assigns a fresh uuid to a duplicated block).
  neo4jProperties.uuid = node.attrs.uuid;

  // Type property: Essential for saving annotations
  neo4jProperties.type = node.attrs._type ?? node.attrs._annotationData.type ?? node.type.name;

  // tiptap-native attrs that may have been edited in the UI, override the
  // stale _annotationData values with the current tiptap attr values.
  if (neo4jProperties.type === 'heading' && node.attrs.level !== undefined) {
    neo4jProperties.level = node.attrs.level;
  }

  const isPartOfTable: boolean =
    neo4jProperties.type === 'tableCell' || neo4jProperties.type === 'tableHeader';

  if (isPartOfTable && node.attrs.colspan !== undefined) {
    neo4jProperties.colspan = node.attrs.colspan;
    neo4jProperties.rowspan = node.attrs.rowspan;
  }

  return neo4jProperties;
}

function findChangedStructureElements(indexMap: IndexMap, plainText: string): Annotation[] {
  const affectedElements: Annotation[] = [];

  const docNodes = new Map<string, DocNode>();

  tiptap.value?.state.doc.descendants(node => {
    if (isStructureElement(node)) {
      docNodes.set(node.attrs.uuid, node);
    }
  });

  // Loop through nodes currently in the editor
  indexMap.forEach((value, uuid) => {
    const docNode: DocNode | undefined = docNodes.get(uuid);

    // Should not happen actually
    if (!docNode) {
      console.error(`The annotation with uuid ${uuid} could not be found`);
      return;
    }

    const initialEntry: Annotation | undefined = initialStructuralAnnotations.value?.get(uuid);

    const { startIndex, endIndex } = value;
    const textSlice: string = plainText.slice(startIndex, endIndex + 1);

    // TODO: Always "modified" for now since it is likely anyway (changed text). Fix later maybe
    const status: NodeStatus = initialEntry ? 'modified' : 'created';

    // Create annotation object (needed)
    const annotation: Annotation = {
      node: {
        data: {
          ...getConfiguredNodeAttrs(docNode, docNode.type.name),
          startIndex,
          endIndex,
          text: textSlice,
        } as IAnnotation,
        nodeLabels: ['Annotation'],
      },
      connectedNodes: [],
      meta: {
        status: status,
      },
    };

    affectedElements.push(annotation);
  });

  // Get elements which are deleted in editor
  const uuidsInEditor = new Set<string>([...indexMap.keys()]);
  const initialUuids = new Set<string>([...(initialStructuralAnnotations.value?.keys() ?? [])]);
  const deletedUuids = initialUuids.difference(uuidsInEditor);

  deletedUuids.forEach(uuid => {
    const annoEntry: Annotation = initialStructuralAnnotations.value?.get(uuid)!;

    const cloned: Annotation = { ...cloneDeep(annoEntry), meta: { status: 'deleted' } };

    affectedElements.push(cloned);
  });

  return affectedElements;
}

function getAffectedAnnotations(): { annotations: Annotation[]; structureElements: Annotation[] } {
  const plainText: string = tiptap.value!.state.doc.textContent;

  const { decorationIndexMap, structureBlockIndexMap, zeroPointIndexMap, hardBreakIndexMap } =
    useCreateIndexMaps().buildIndexMaps();

  // logMap('structureBlockIndexMap', structureBlockIndexMap as IndexMap);
  // logMap('hardBreakIndexMap', hardBreakIndexMap as IndexMap);
  // logMap('zeroPointIndexMap', zeroPointIndexMap as IndexMap);
  // logMap('decorationIndexMap', decorationIndexMap as IndexMap);

  // Zero point and range annotation are stored in the same store and can therefore share the same index map
  const changedAnnotations = findChangedAnnotations(
    new Map([...decorationIndexMap, ...zeroPointIndexMap]) as IndexMap,
    plainText,
  );

  // hardBreaks and blocks are stored in the same store and can therefore share the same index map
  const affectedStructureBlocks = findChangedStructureElements(
    new Map([...structureBlockIndexMap, ...hardBreakIndexMap]) as IndexMap,
    plainText,
  );

  return { annotations: changedAnnotations, structureElements: affectedStructureBlocks };
}

export type EdgeDescriptor = {
  type: string;
  startUuid: string;
  endUuid: string;
};

function inferRelationship(parent: Node<BaseNodeData>, child: Node<BaseNodeData>): EdgeDescriptor {
  const parentUuid: string = (parent.data as BaseNodeData).uuid;
  const childUuid: string = (child.data as BaseNodeData).uuid;

  const p: string[] = parent.nodeLabels;
  const c: string[] = child.nodeLabels;

  // Annotation → Annotation: sub-annotation (e.g. commentary text)
  if (p.includes('Annotation') && c.includes('Annotation')) {
    return { type: 'HAS_ANNOTATION', startUuid: parentUuid, endUuid: childUuid };
  }

  // Annotation → Entity | Collection | Text: referenced nodes
  if (p.includes('Annotation')) {
    return { type: 'REFERS_TO', startUuid: parentUuid, endUuid: childUuid };
  }

  // Text | Collection → Annotation
  if (c.includes('Annotation')) {
    return { type: 'HAS_ANNOTATION', startUuid: parentUuid, endUuid: childUuid };
  }

  // Collection → Text | Collection → Collection: edge runs (Text|Collection)-[:PART_OF]->(Collection)
  if (p.includes('Collection') && (c.includes('Content') || c.includes('Collection'))) {
    return { type: 'PART_OF', startUuid: childUuid, endUuid: parentUuid };
  }

  throw new Error(`Cannot infer relationship between [${p.join(', ')}] and [${c.join(', ')}]`);
}

type UpdateObject = {
  create: (AnnotationNode | CollectionNode | EntityNode | TextNode)[];
  delete: (AnnotationNode | CollectionNode | EntityNode | TextNode)[];
  update: (AnnotationNode | CollectionNode | EntityNode | TextNode)[];
  remove: { startUuid: string; endUuid: string }[];
  attach: { startUuid: string; endUuid: string }[];
};

/** Temporary, used in backend */
function insertNodeIntoObject(
  parent: NodeStatusObject | null,
  node: NodeStatusObject,
  obj: UpdateObject,
): UpdateObject {
  node.connectedNodes.forEach(child => insertNodeIntoObject(node, child, obj));

  if (node.meta.status === 'deleted') {
    obj.delete.push(node.node);
  }

  if (node.meta.status === 'created') {
    obj.create.push(node.node);
  }

  if (node.meta.status === 'modified') {
    obj.update.push(node.node);
  }

  // Added/created with existing parent
  if (parent && (node.meta.status === 'created' || node.meta.status === 'added')) {
    obj.attach.push(inferRelationship(parent.node, node.node));
  }

  // Removed, but parent was deleted anyway
  if (parent && node.meta.status === 'removed' && parent.meta.status !== 'deleted') {
    obj.remove.push(inferRelationship(parent.node, node.node));
  }

  return obj;
}

/** Temporary, used in backend */
function flattenNodeTree(textDto: TextUpdateDto): UpdateObject {
  const obj: UpdateObject = {
    create: [],
    delete: [],
    update: [],
    remove: [],
    attach: [],
  };

  insertNodeIntoObject(null, { ...textDto.text, connectedNodes: textDto.annotations }, obj);

  return obj;
}

// TODO: Annotations structure has changed, overhaul all methods inside
async function handleSaveChanges(): Promise<void> {
  if (!tiptap.value) {
    return;
  }

  // if (!hasUnsavedChanges()) {
  //   console.log('no changes made, no request needed');
  //   return;
  // }

  const nodesWithoutChildrenOrText = getEmptyNodes();

  if (nodesWithoutChildrenOrText.length > 0) {
    console.warn('Some nodes have no text: ', nodesWithoutChildrenOrText);

    addToastMessage({
      severity: 'warn',
      summary: 'Empty block',
      detail:
        'Some nodes do not contain text or children. Please delete them or add text: ' +
        nodesWithoutChildrenOrText,
      life: 3000,
    });

    return;
  }

  const affectedAnnotations = getAffectedAnnotations();

  const { structureElements, annotations } = affectedAnnotations;

  const annotationsToUpdate: Annotation[] = [...structureElements, ...annotations];
  const newTextNode: NodeStatusObject<TextNode> = {
    node: {
      data: {
        uuid: text.value.data.uuid,
        text: tiptap.value!.state.doc.textContent,
      },
      nodeLabels: [...text.value.nodeLabels],
    },
    meta: { status: 'modified' },
    connectedNodes: [],
  };

  // Object to send via API
  const textToUpdate: TextUpdateDto = {
    text: toValue(newTextNode),
    annotations: toValue(annotationsToUpdate),
  };

  // Only for testing purposes
  const flattened = flattenNodeTree(textToUpdate);
  console.log(flattened);

  asyncOperationRunning.value = true;
  try {
    await api.updateText(text.value.data.uuid, textToUpdate);

    // Update all initial values: Annotations, structuralAnnotations and text

    cleanUpAfterSave(newTextNode, affectedAnnotations);

    showMessage('success');
  } catch (error: unknown) {
    showMessage('error', error as Error);
    console.error('Error updating text:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

function traverseNodeTreeAndSetToCreated(node: NodeStatusObject) {
  node.meta.status = 'unchanged';

  node.connectedNodes.forEach(child => traverseNodeTreeAndSetToCreated(child));
}

async function handleCancelChanges(): Promise<void> {
  text.value = cloneDeep(initialText.value);

  resetToInitialState();
}

function toggleSidebar(position: 'left' | 'right', wasCollapsed: boolean): void {
  const sidebar = sidebars.value[position];
  sidebar.isCollapsed = !wasCollapsed;
}

function handleResize(event: MouseEvent): void {
  const sidebar: SidebarConfig = sidebars.value[activeResizer.value];
  sidebar.width =
    activeResizer.value === 'left' ? event.clientX : window.innerWidth - event.clientX;
}

function handleMouseDown(event: MouseEvent): void {
  if (!(event.target as Element).classList.contains('resizer')) {
    return;
  }

  const side: string = (event.target as Element).getAttribute('resizer-id');
  activeResizer.value = side;
  window.addEventListener('mousemove', handleResize);
}

function handleKeyDown(event: KeyboardEvent): void {
  const keys: string[] = [];

  if (event.ctrlKey) {
    keys.push('ctrl');
  }

  if (event.shiftKey) {
    keys.push('shift');
  }

  if (event.altKey) {
    keys.push('alt');
  }

  if (event.metaKey) {
    keys.push('meta');
  }

  keys.push(event.key.toLowerCase());

  const keyCombo: string = normalizeKeys(keys);

  // Quick hack to remove backdrop from redraw mode
  if (keys.length === 1 && keys[0] === 'escape') {
    toggleRedrawMode({ direction: 'off', cause: 'cancel' });
  }

  // Check if the shortcut combo exists, execute callback function
  if (shortcutMap.value.has(keyCombo)) {
    event.preventDefault();

    if (isRedrawMode.value) {
      return;
    }

    shortcutMap.value.get(keyCombo)();
  }
}

function handleMouseUp(): void {
  activeResizer.value = '';
  window.removeEventListener('mousemove', handleResize);
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  preventUserFromPageLeaving(event);
}

function showMessage(result: 'success' | 'error', error?: Error) {
  addToastMessage({
    severity: result,
    summary: result === 'success' ? 'Changes saved successfully' : 'Error saving changes',
    detail: error?.message ?? '',
    life: 2000,
  });
}

// function findChangesetBoundaries(): {
//   uuidStart: string | null;
//   uuidEnd: string | null;
// } {
//   let uuidStart: string | null = beforeStartIndex.value
//     ? totalCharacters.value[beforeStartIndex.value].data.uuid
//     : null;

//   let uuidEnd: string | null = afterEndIndex.value
//     ? totalCharacters.value[afterEndIndex.value].data.uuid
//     : null;

//   for (let index = 0; index < snippetCharacters.value.length; index++) {
//     if (
//       snippetCharacters.value[index].data.uuid !== initialSnippetCharacters.value[index]?.data.uuid
//     ) {
//       break;
//     }

//     uuidStart = snippetCharacters.value[index].data.uuid;

//     if (
//       index === snippetCharacters.value.length - 1 &&
//       snippetCharacters.value.length >= initialSnippetCharacters.value.length
//     ) {
//       uuidStart = beforeStartIndex.value
//         ? totalCharacters.value[beforeStartIndex.value].data.uuid
//         : null;
//     }
//   }

//   const reversedCharacters: Character[] = [...snippetCharacters.value].reverse();
//   const reversedInitialCharacters: Character[] = [...initialSnippetCharacters.value].reverse();

//   for (let index = 0; index < reversedCharacters.length; index++) {
//     if (reversedCharacters[index].data.uuid !== reversedInitialCharacters[index]?.data.uuid) {
//       break;
//     }

//     uuidEnd = reversedCharacters[index].data.uuid;

//     if (
//       index === reversedCharacters.length - 1 &&
//       reversedCharacters.length >= reversedInitialCharacters.length
//     ) {
//       uuidEnd = afterEndIndex.value ? totalCharacters.value[afterEndIndex.value].data.uuid : null;
//     }
//   }

//   return { uuidStart, uuidEnd };
// }

function preventUserFromPageLeaving(event: BeforeUnloadEvent): string {
  if (!isValidText.value) {
    return;
  }

  if (!hasUnsavedChanges()) {
    return;
  }

  event.preventDefault();

  const confirmationMessage = 'Do you really want to leave? You have unsaved changes.';
  event.returnValue = confirmationMessage;

  return confirmationMessage;
}

function preventUserFromRouteLeaving(): boolean {
  if (!isValidText.value) {
    return true;
  }

  if (!hasUnsavedChanges()) {
    return true;
  }

  // TODO: Use PrimeVue confirmation dialog instead of browser default?
  const answer: boolean = window.confirm('Do you really want to leave? you have unsaved changes');

  // cancel the navigation and stay on the same page
  if (!answer) {
    return false;
  }

  return true;
}

watch(
  textUuid,
  async () => {
    isLoading.value = true;

    // TODO: This needs refactoring. Centralize fetches, split fetch/initialize logic
    await fetchAndInitializeText(textUuid.value);

    const text: TextAccessObject = await api.getTextAccessObject(textUuid.value);

    if (!isValidText.value) {
      isLoading.value = false;
      return;
    }

    // await fetchAndInitializeCharacters(text.value.data.uuid);

    // if (charactersFetchError.value) {
    //   isLoading.value = false;
    //   return;
    // }

    const fetchedAnnotations: NodeDto[] = await api.getAnnotations('text', textUuid.value);
    // if (annotationFetchError.value) {
    //   isLoading.value = false;
    //   return;
    // }

    const standoffObject = { text: text.text.data.text, annotations: fetchedAnnotations };

    initializeTiptap(standoffObject);

    isLoading.value = false;
  },
  { immediate: true },
);
</script>

<template>
  <PageOverlay v-if="isLoading === true">
    <LoadingSpinner />
  </PageOverlay>
  <EditorError v-else-if="isValidText === false" :uuid="textUuid" />
  <div v-else class="container flex h-screen">
    <PageOverlay v-if="asyncOperationRunning">
      <LoadingSpinner />
    </PageOverlay>

    <PageOverlay
      v-if="redrawMode?.direction === 'on'"
      :style="{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 'var(--z-index-overlay)' }"
    >
      <div class="flex justify-content-center pt-4">
        <Message class="text-center w-6" severity="info" icon="pi pi-info-circle">
          <p><strong>Edit annotated text</strong></p>
          <p>Select the new text that should belong to this annotation.</p>
          <p>
            To cancel the operation, click the <i class="pi pi-times-circle"></i> button in the
            annotation panel on the right or press <kbd>Esc</kbd>.
          </p>
        </Message>
      </div>
    </PageOverlay>

    <EditorSidebar
      position="left"
      :isCollapsed="sidebars['left'].isCollapsed === true"
      :width="sidebars['left'].width"
    >
      <EditorMetadata />
      <EditorToC />
      <EditorAnnotations />
    </EditorSidebar>
    <EditorResizer
      position="left"
      :isActive="activeResizer === 'left'"
      :defaultWidth="resizerWidth"
      :sidebarIsCollapsed="sidebars['left'].isCollapsed === true"
      @toggle-sidebar="toggleSidebar"
    />
    <section
      class="main flex flex-column flex-grow-1 px-3 pb-0 pt-3"
      :style="{ width: mainWidth + 'px' }"
    >
      <EditorHeader ref="labelInputRef" />
      <EditorAnnotationButtonPaneNew />
      <editor-content id="editor" :editor="tiptap" spellcheck="false" />

      <EditorActionButtonsPane
        @save="handleSaveChanges"
        @cancel="handleCancelChanges"
        @log="console.log(tiptap?.state.doc)"
      />
    </section>
    <EditorResizer
      position="right"
      :isActive="activeResizer === 'right'"
      :defaultWidth="resizerWidth"
      :sidebarIsCollapsed="sidebars['right'].isCollapsed === true"
      @toggle-sidebar="toggleSidebar"
    />
    <EditorSidebar
      position="right"
      :isCollapsed="sidebars['right'].isCollapsed === true"
      :width="sidebars['right'].width"
    >
      <EditorFilter />
      <NewEditorAnnotationPanel />
    </EditorSidebar>
  </div>
</template>

<style>
:root {
  --gray-1: rgba(61, 37, 20, 0.05);
  --gray-2: rgba(61, 37, 20, 0.08);
  --gray-3: rgba(61, 37, 20, 0.12);
  --gray-4: rgba(53, 38, 28, 0.3);
  --gray-5: rgba(28, 25, 23, 0.6);
  --purple: #6a00f5;
}

#editor {
  overflow-y: scroll;
  flex-grow: 1;
  display: flex;
  padding: 5px;
  /* outline: 1px solid var(--purple); */
}

.tiptap-editor-pane:focus-visible {
  /* background-color: green; */
  outline: 0;
  flex-grow: 1;
}

/* Table-specific styling */
table {
  border-collapse: collapse;
  margin: 0;
  overflow: hidden;
  table-layout: fixed;
  width: 100%;

  td,
  th {
    border: 1px solid var(--gray-3);
    box-sizing: border-box;
    min-width: 1em;
    padding: 6px 8px;
    position: relative;
    vertical-align: top;

    > * {
      margin-bottom: 0;
    }
  }

  th {
    background-color: var(--gray-1);
    font-weight: bold;
    text-align: left;
  }

  .selectedCell:after {
    background: var(--gray-2);
    content: '';
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    pointer-events: none;
    position: absolute;
    z-index: 2;
  }

  .column-resize-handle {
    background-color: var(--purple);
    bottom: -2px;
    pointer-events: none;
    position: absolute;
    right: -2px;
    top: 0;
    width: 4px;
  }
}

.tableWrapper {
  margin: 1.5rem 0;
  overflow-x: auto;
}

&.resize-cursor {
  cursor: ew-resize;
  cursor: col-resize;
}

/* List styles */
ul,
ol {
  padding: 0 1rem;
  margin: 1.25rem 1rem 1.25rem 0.4rem;

  li p {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }
}
</style>
