<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
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
import { cloneDeep } from '../utils/helper/helper';
import NodeStatusBadge from './NodeStatusBadge.vue';

const props = defineProps<{
  annotation: NodeStatusObject<AnnotationNode>;
}>();

const initialData = toRef<NodeStatusObject<AnnotationNode>>(cloneDeep(props.annotation));
const workingData = ref<NodeStatusObject<AnnotationNode>>(cloneDeep(props.annotation));

const confirm = useConfirm();

const { tiptap, annotations } = useTiptapStore();
const { isRedrawMode, redrawMode } = useEditorStore();
const { getAnnotationConfig, getAnnotationFields } = useGuidelinesStore();

const config: AnnotationType = getAnnotationConfig(workingData.value.node.data.type);
// TODO: Maybe give whole config instead of only fields...?
const propertyFields: PropertyConfig[] = getAnnotationFields(workingData.value.node.data.type);

const mode = ref<'view' | 'edit'>('view');

const isCollapsed = ref<boolean>(true);
const propertiesAreCollapsed = ref<boolean>(false);
const previewText = computed<string>(() => {
  const sliced: string = workingData.value.node.data.text?.slice(0, 10);

  return workingData.value.node.data.text?.length >= 10
    ? sliced + '...'
    : workingData.value.node.data.text;
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
      const annoEntry: Annotation | undefined = annotations.value?.get(
        workingData.value.node.data.uuid,
      );

      if (!annoEntry) {
        return;
      }

      // Do NOT set status to 'deleted' - this is determined during save preprocessing
      // when checked what annotations are in the document
      // annoEntry.meta.status = 'deleted';

      // Remove decoration
      tiptap.value?.commands.removeAnnotationDecoration(workingData.value.node);
    },
    reject: () => {},
  });
}

function handleEditAnnotation(): void {
  toggleCollapsed(false);
  toggleFormMode('edit');
}

function handleSaveChanges(): void {
  updateData();
  toggleFormMode('view');
}

function handleCancelChanges(): void {
  resetData();
  toggleFormMode('view');
}

function handleRedraw(): void {
  // if (isRedrawMode.value) {
  //   toggleRedrawMode({ direction: 'off', cause: 'cancel' });
  // } else {
  //   toggleRedrawMode({ direction: 'on', annotationUuid: workingData.node.data.uuid });
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

function resetData() {
  workingData.value = cloneDeep(initialData.value);
}

function toggleFormMode(newState?: 'view' | 'edit'): void {
  if (newState) {
    mode.value = newState;
  } else {
    mode.value = newState ?? mode.value === 'view' ? 'edit' : 'view';
  }
}

function updateData(): void {
  const newData: NodeStatusObject<AnnotationNode> = cloneDeep(workingData.value);

  console.log(newData);
  // Set status field depeding on whether the annotation freshly created
  if (initialData.value.meta.status === 'created') {
    newData.meta.status = 'created';
  } else {
    newData.meta.status = 'modified';
  }

  const uuid: string = workingData.value.node.data.uuid;
  const entry: NodeStatusObject<AnnotationNode> | undefined = annotations.value?.get(uuid);

  if (!entry) {
    return;
  }

  workingData.value = newData;
  initialData.value = cloneDeep(newData);
  annotations.value?.set(uuid, newData);
}
</script>

<template>
  <div
    class="annotation-card mb-3"
    :data-annotation-uuid="workingData.node.data.uuid"
    :data-mode="mode"
  >
    <div class="annotation-card-header">
      <div class="flex items-center gap-1 align-items-center">
        <div class="icon-container">
          <AnnotationTypeIcon
            :annotationType="workingData.node.data.subType ?? workingData.node.data.type"
          />
        </div>
        <span class="font-bold">{{
          workingData.node.data.subType ?? workingData.node.data.type
        }}</span>
        <span class="font-italic text-xs text-color-secondary" :title="workingData.node.data.text">
          {{ previewText }}
        </span>
        <!-- <div class="spy pi pi-eye cursor-pointer" title="Show annotated text"></div> -->
      </div>
      <NodeStatusBadge :status="workingData.meta.status" />
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
          v-model="workingData.node.data"
          :fields="propertyFields"
          :mode="mode"
        />
      </Fieldset>
      <AnnotationFormAdditionalNodesSection
        v-if="config.hasEntities === true"
        v-model="workingData.connectedNodes"
        :mode="mode"
        :annotation-config="config"
      />
    </div>

    <div class="annotation-card-footer">
      <!-- <div
        v-if="mode === 'view'"
        class="edit-buttons flex justify-content-center align-items-center"
      >
        <Button
          icon="pi pi-angle-left"
          size="small"
          severity="secondary"
          rounded
          title="Move annotation left by one character"
          :disabled="true"
          @click="handleShiftLeft"
          :style="{ width: '20px', height: '20px' }"
        />
        <Button
          icon="pi pi-angle-right"
          size="small"
          severity="secondary"
          rounded
          title="Move annotation right by one character"
          :disabled="true"
          @click="handleShiftRight"
          :style="{ width: '20px', height: '20px' }"
        />
        <Button
          icon="pi pi-plus"
          size="small"
          severity="secondary"
          rounded
          title="Expand annotation right by one character"
          :disabled="true || config.isZeroPoint"
          @click="handleExpand"
          :style="{ width: '20px', height: '20px' }"
        />
        <Button
          icon="pi pi-minus"
          size="small"
          severity="secondary"
          rounded
          title="Shrink annotation from the right by one character"
          :disabled="true || config.isZeroPoint"
          @click="handleShrink"
          :style="{ width: '20px', height: '20px' }"
        />
        <Button
          :icon="redrawButtonicon"
          size="small"
          severity="secondary"
          rounded
          :title="redrawButtonTitle"
          :disabled="true"
          @click="handleRedraw"
          :style="{ width: '20px', height: '20px' }"
        />
      </div> -->
      <div class="action-buttons flex gap-1 justify-content-center">
        <Button
          v-if="mode === 'view'"
          title="Delete annotation"
          severity="danger"
          icon="pi pi-trash"
          size="small"
          @click="handleDeleteAnnotation"
          :style="{ width: '25px', height: '25px' }"
        />
        <Button
          v-if="mode === 'view'"
          title="Edit annotation"
          severity="contrast"
          icon="pi pi-pencil"
          size="small"
          @click="handleEditAnnotation"
          :style="{ width: '25px', height: '25px' }"
        />
        <Button
          v-if="mode === 'edit'"
          label="Save"
          title="Save changes"
          severity="primary"
          icon="pi pi-check"
          size="small"
          @click="handleSaveChanges"
        />
        <Button
          v-if="mode === 'edit'"
          label="Cancel"
          title="Cancel changes"
          severity="secondary"
          icon="pi pi-times"
          size="small"
          @click="handleCancelChanges"
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
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--p-panel-header-background);
  justify-content: center;
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
