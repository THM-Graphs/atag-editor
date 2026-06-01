<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useGuidelinesStore } from '../store/guidelines';
import { capitalize } from '../utils/helper/helper';
import AnnotationButton from './AnnotationButton.vue';
import { AnnotationType, NodeStatusObject, AnnotationNode, Annotation } from '../models/types';
import { useCreateAnnotation } from '../composables/useCreateAnnotation';
import { useFilterStore } from '../store/filter';
import ShortcutError from '../utils/errors/shortcut.error';
import AnnotationRangeError from '../utils/errors/annotationRange.error';
import { useAppStore } from '../store/app';
import { useDialog } from 'primevue';
import AnnotationCreateModal from './AnnotationCreateModal.vue';
import { useTiptapStore } from '../store/tiptap';
import { useValidateTextSelection } from '../composables/useValidateTextSelection';
import { Selection } from '@tiptap/pm/state';
import Button from 'primevue/button';
import TableInsertPopover from './TableInsertPopover.vue';

const { isValid: isSelectionValid } = useValidateTextSelection();

const { groupedAnnotationTypes, annotationHasConstraints, getAnnotationConfig, isZeroPoint } =
  useGuidelinesStore();
const { addToastMessage, createModalInstance, destroyModalInstance } = useAppStore();
const { selectedOptions } = useFilterStore();
const { createTextAnnotation: createAnnotation } = useCreateAnnotation('Text');

const { tiptap, annotations } = useTiptapStore();

const dialog: ReturnType<typeof useDialog> = useDialog();

/**
 * Checks if the annotation type is enabled by verifying if it is included in the selected options. If not, an `ShortcutError` is thrown.
 *
 * @throws {ShortcutError} If the annotation type is not enabled in the current filter settings.
 * @returns {boolean} True if the annotation type is enabled.
 */
function isAnnotationTypeEnabled(type: string): boolean {
  if (!selectedOptions.value.includes(type)) {
    throw new ShortcutError(
      `Annotations of type "${type}" are not enabled currently. Use the Filter component to enable the type.`,
    );
  }

  return true;
}

function handleClick(data: { type: string; subType?: string | number }) {
  const selection: Selection | undefined = tiptap.value?.state.selection;

  if (!selection) {
    return;
  }

  try {
    const config: AnnotationType = getAnnotationConfig(data.type);

    isAnnotationTypeEnabled(data.type);
    isSelectionValid(selection, config);

    // Needs to be captured since modal opening collapses editor selection
    const capturedSelection = { from: selection.from, to: selection.to };

    const textInSelection: string =
      tiptap.value?.state.doc.textBetween(selection.from, selection.to) ?? '';

    const newAnnotationTemplate: NodeStatusObject<AnnotationNode> = createAnnotation({
      ...data,
      selectedText: textInSelection,
    });

    if (annotationHasConstraints(config)) {
      createModalInstance(
        dialog.open(AnnotationCreateModal, {
          props: {
            modal: true,
            closable: false,
            closeOnEscape: true,
            dismissableMask: true,
            style: { width: '25rem', height: '35rem' },
            pt: {
              content: {
                style: {
                  flexGrow: 1,
                },
              },
            },
          },
          data: {
            annotation: newAnnotationTemplate,
          },
          emits: {
            onSubmit: (editedAnnotationData: Annotation) => {
              addAnnotation(editedAnnotationData, capturedSelection);
              destroyModalInstance();
            },
          },
          onClose: destroyModalInstance,
        }),
      );
    } else {
      addAnnotation(newAnnotationTemplate, capturedSelection);
    }
  } catch (error: unknown) {
    if (error instanceof AnnotationRangeError) {
      addToastMessage({
        severity: 'warn',
        summary: 'Invalid selection',
        detail: error.message,
        life: 3000,
      });
    } else if (error instanceof ShortcutError) {
      addToastMessage({
        severity: 'warn',
        summary: 'Annotation type not enabled',
        detail: error.message,
        life: 3000,
      });
    } else {
      console.error('Unexpected error:', error);
    }
  } finally {
    tiptap.value
      ?.chain()
      .focus()
      .setTextSelection(selection.to ?? 0)
      .run();
  }
}

/**
 * Adds a new annotation to the store by executing the `createAnnotation` command.
 *
 * @param {Annotation} annotation - The annotation to add to the store.
 * @param {Object} selection - The selection object with `from` and `to` properties.
 * @returns {void} This function does not return any value.
 */
function addAnnotation(annotation: Annotation, selection: { from: number; to: number }): void {
  const { from, to } = selection;
  const isAnnoZeroPoint: boolean = isZeroPoint(annotation.node);

  // Add decoration or inline block, depeding on config
  if (isAnnoZeroPoint) {
    // TODO: Cursor is set before the inserted element, not after. Fix later
    tiptap.value?.commands.addZeroPointAnnotation(annotation.node, from);
  } else {
    tiptap.value?.commands.addAnnotationDecoration(annotation.node, from, to);
  }
  // Add to store
  annotations.value?.set(annotation.node.data.uuid, annotation);
}

const tablePopover = useTemplateRef<InstanceType<typeof TableInsertPopover>>('table-popover');
</script>

<template>
  <div class="annotation-button-pane flex flex-wrap gap-3">
    <div
      class="group"
      v-for="(annotationTypes, category) in groupedAnnotationTypes"
      :key="category"
    >
      <div class="name font-semibold pb-2">{{ capitalize(category) }}</div>
      <div class="buttons">
        <template v-if="category !== 'structure'">
          <AnnotationButton
            v-for="type in annotationTypes"
            :type="type.type"
            :key="type.type"
            :disabled="!selectedOptions.includes(type.type)"
            :config="getAnnotationConfig(type.type)"
            @clicked="handleClick($event)"
          />
        </template>
        <template v-else>
          <Button
            severity="secondary"
            v-tooltip.hover.top="{ value: 'h1', showDelay: 50 }"
            @click="tiptap?.chain().focus().toggleHeading({ level: 1, type: 'heading' }).run()"
            :class="{ 'is-active': tiptap?.isActive('heading', { level: 1 }) }"
          >
            H1
          </Button>
          <Button
            severity="secondary"
            v-tooltip.hover.top="{ value: 'h2', showDelay: 50 }"
            @click="tiptap?.chain().focus().toggleHeading({ level: 2, type: 'heading' }).run()"
            :class="{ 'is-active': tiptap?.isActive('heading', { level: 2 }) }"
          >
            H2
          </Button>
          <Button
            severity="secondary"
            v-tooltip.hover.top="{ value: 'h3', showDelay: 50 }"
            @click="tiptap?.chain().focus().toggleHeading({ level: 3, type: 'heading' }).run()"
            :class="{ 'is-active': tiptap?.isActive('heading', { level: 3 }) }"
          >
            H3
          </Button>
          <Button
            severity="secondary"
            icon="pi pi-align-justify"
            v-tooltip.hover.top="{ value: 'paragraph', showDelay: 50 }"
            @click="tiptap?.chain().focus().setNode('paragraph', { type: 'paragraph' }).run()"
            :class="{ 'is-active': tiptap?.isActive('paragraph') }"
          >
          </Button>
          <Button
            severity="secondary"
            icon="pi pi-table"
            v-tooltip.hover.top="{ value: 'table', showDelay: 50 }"
            :class="{ 'is-active': tiptap?.isActive('table') }"
            @click="tablePopover?.toggle($event)"
          >
          </Button>
        </template>
      </div>
    </div>
  </div>

  <TableInsertPopover ref="table-popover" />
</template>

<style scoped>
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
</style>
