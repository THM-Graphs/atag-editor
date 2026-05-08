<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEditorStore } from '../store/editor';
import { useGuidelinesStore } from '../store/guidelines';
import Button from 'primevue/button';
import ConfirmPopup from 'primevue/confirmpopup';
import Fieldset from 'primevue/fieldset';
import { useConfirm } from 'primevue/useconfirm';
import {
  Annotation,
  AnnotationNode,
  AnnotationType,
  NodeStatusObject,
  PropertyConfig,
} from '../models/types';
import AnnotationTypeIcon from './AnnotationTypeIcon.vue';
import FormPropertiesSection from './FormPropertiesSection.vue';
import { useTiptapStore } from '../store/tiptap';
import AnnotationFormAdditionalNodesSection from './AnnotationFormAdditionalNodesSection.vue';

const props = defineProps<{
  annotation: NodeStatusObject<AnnotationNode>;
}>();

const { annotation } = props;

const confirm = useConfirm();

const { tiptap, annotations } = useTiptapStore();
const { isRedrawMode, redrawMode } = useEditorStore();
const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();

const config: AnnotationType = getAnnotationConfig(annotation.node.data.type);
// TODO: Maybe give whole config instead of only fields...?
const propertyFields: PropertyConfig[] = getAnnotationFields(annotation.node.data.type);

const isCollapsed = ref<boolean>(true);
const propertiesAreCollapsed = ref<boolean>(false);
const previewText = computed<string>(() => {
  const sliced: string = annotation.node.data.text?.slice(0, 10);

  return annotation.node.data.text?.length >= 10 ? sliced + '...' : annotation.node.data.text;
});
const redrawButtonicon = computed<string>(() =>
  redrawMode.value?.direction === 'on' ? 'pi pi-times' : 'pi pi-pencil',
);
const redrawButtonTitle = computed<string>(() =>
  isRedrawMode.value ? 'Cancel redraw operation' : 'Redraw annotation',
);

function handleDeleteAnnotation(event: MouseEvent): void {
  confirm.require({
    target: event.currentTarget as HTMLButtonElement,
    message: 'Do you want to delete this annotation?',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
      title: 'Cancel',
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
      title: 'Delete annotation',
    },
    accept: () => {
      // TODO: Might be changed when the "status" behaviour is changed.
      const annoEntry: Annotation | undefined = annotations.value?.get(annotation.node.data.uuid);

      if (!annoEntry) {
        return;
      }

      // Set annotation deleted
      annoEntry.meta.status = 'deleted';

      // Remove decoration
      tiptap.value?.commands.removeAnnotationDecoration(annotation.node);
    },
    reject: () => {},
  });
}

function handleRedraw(): void {
  // if (isRedrawMode.value) {
  //   toggleRedrawMode({ direction: 'off', cause: 'cancel' });
  // } else {
  //   toggleRedrawMode({ direction: 'on', annotationUuid: annotation.node.data.uuid });
  // }
}

function handleShiftLeft(): void {
  // execCommand('shiftAnnotationLeft', { annotation });
}

function handleShiftRight(): void {
  // execCommand('shiftAnnotationRight', { annotation });
}

function handleExpand(): void {
  // execCommand('expandAnnotation', { annotation });
}

function handleShrink(): void {
  // execCommand('shrinkAnnotation', { annotation });
}

function toggleCollapsed(newState?: boolean): void {
  isCollapsed.value = newState ?? !isCollapsed.value;
}
</script>

<template>
  <div class="annotation-card mb-3" :data-annotation-uuid="annotation.node.data.uuid">
    <div class="annotation-card-header">
      <div class="flex items-center gap-1 align-items-center">
        <div class="icon-container">
          <AnnotationTypeIcon
            :annotationType="annotation.node.data.subType ?? annotation.node.data.type"
          />
        </div>
        <span class="font-bold">{{
          annotation.node.data.subType ?? annotation.node.data.type
        }}</span>
        <span class="font-italic text-xs text-color-secondary" :title="annotation.node.data.text">
          {{ previewText }}
        </span>
        <div class="spy pi pi-eye cursor-pointer" title="Show annotated text"></div>
      </div>
      <Button
        :icon="`pi pi-chevron-${isCollapsed ? 'down' : 'up'}`"
        severity="secondary"
        title="Toggle full view"
        rounded
        text
        size="small"
        @click.stop="toggleCollapsed()"
      />
    </div>

    <div v-show="!isCollapsed" class="annotation-card-body">
      <Fieldset
        legend="Properties"
        :toggle-button-props="{
          title: `${propertiesAreCollapsed ? 'Expand' : 'Collapse'} properties`,
        }"
        :toggleable="true"
        @toggle="propertiesAreCollapsed = !propertiesAreCollapsed"
      >
        <template #toggleicon>
          <span :class="`pi pi-chevron-${propertiesAreCollapsed ? 'down' : 'up'}`"></span>
        </template>
        <FormPropertiesSection
          v-model="annotation.node.data"
          :fields="propertyFields"
          mode="edit"
        />
      </Fieldset>
      <AnnotationFormAdditionalNodesSection
        v-if="config.hasEntities === true"
        v-model="annotation.connectedNodes"
        mode="edit"
        :annotation-config="config"
      />
    </div>

    <div class="annotation-card-footer">
      <div class="edit-buttons flex justify-content-center">
        <Button
          icon="pi pi-angle-left"
          size="small"
          severity="secondary"
          rounded
          title="Move annotation left by one character"
          :disabled="true"
          @click="handleShiftLeft"
        />
        <Button
          icon="pi pi-angle-right"
          size="small"
          severity="secondary"
          rounded
          title="Move annotation right by one character"
          :disabled="true"
          @click="handleShiftRight"
        />
        <Button
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          rounded
          title="Expand annotation right by one character"
          :disabled="true || config.isZeroPoint"
          @click="handleExpand"
        />
        <Button
          icon="pi pi-minus"
          size="small"
          severity="secondary"
          rounded
          title="Shrink annotation from the right by one character"
          :disabled="true || config.isZeroPoint"
          @click="handleShrink"
        />
        <Button
          :icon="redrawButtonicon"
          :style="{ zIndex: 99999 }"
          size="small"
          severity="secondary"
          rounded
          :title="redrawButtonTitle"
          :disabled="true"
          @click="handleRedraw"
        />
      </div>
      <div class="action-buttons flex justify-content-center">
        <Button
          label="Delete"
          title="Delete annotation"
          severity="danger"
          icon="pi pi-trash"
          size="small"
          @click="handleDeleteAnnotation"
        />
      </div>
    </div>

    <ConfirmPopup />
  </div>
</template>

<style scoped>
.annotation-card {
  border: 1px solid var(--p-primary-color);
  border-radius: var(--p-border-radius-md, 6px);
  overflow: hidden;
  background: var(--p-panel-background);
}

.annotation-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--p-panel-header-background);
  user-select: none;
}

.annotation-card-body {
  padding: 0.75rem;
  background: var(--p-panel-content-background);
}

.annotation-card-footer {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--p-panel-header-background);
}

.icon-container {
  width: 20px;
  height: 20px;
}

.highlight {
  background-color: yellow !important;
}

.hidden {
  display: none;
}
</style>
