<script setup lang="ts">
import { computed, ComputedRef, ref, useTemplateRef, watch } from 'vue';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import ToggleButton from 'primevue/togglebutton';
import { useCollectionManagerStore } from '../store/collectionManager';
import NodeTag from './NodeTag.vue';
import { useGuidelinesStore } from '../store/guidelines';
import {
  AnnotationData,
  AnnotationType,
  CollectionNode,
  CollectionAccessObject,
  CollectionCreationData,
  CollectionPostData,
  ColumnEntry,
  PropertyConfig,
  TextNode,
  NodeDto,
  CollectionAccessStatusObject,
  NodeStatusObject,
} from '../models/types';
import Tag from 'primevue/tag';
import {
  capitalize,
  cloneDeep,
  createNodeDtoFromNode,
  createNodeStatusObjectFromRawData,
  getDefaultValueForProperty,
  createTextNode,
} from '../utils/helper/helper';
import MultiSelect from 'primevue/multiselect';
import DataInputComponent from './DataInputComponent.vue';
import DataInputGroup from './DataInputGroup.vue';
import { useConfirm, useDialog } from 'primevue';
import ConfirmPopup from 'primevue/confirmpopup';
import AnnotationTypeIcon from './AnnotationTypeIcon.vue';
import Panel from 'primevue/panel';
import Fieldset from 'primevue/fieldset';
import FormPropertiesSection from './FormPropertiesSection.vue';
import TextContainer from './TextContainer.vue';
import { useAppStore } from '../store/app';
import { useRouter } from 'vue-router';
import CollectionDeleteModal from './CollectionDeleteModal.vue';
import ProgressSpinner from 'primevue/progressspinner';
import AppError from '../utils/errors/app.error';
import ValidationError from '../utils/errors/validation.error';
import { useBookmarks } from '../composables/useBookmarks';
import AnnotationButton from './AnnotationButton.vue';
import { useCreateAnnotation } from '../composables/useCreateAnnotation';
import AnnotationFormAdditionalNodesSection from './AnnotationFormAdditionalNodesSection.vue';
import NodeStatusBadge from './NodeStatusBadge.vue';

type TabView = 'annotations' | 'details' | 'texts';

const router = useRouter();
const { api, addToastMessage, createModalInstance, destroyModalInstance } = useAppStore();

const dialog: ReturnType<typeof useDialog> = useDialog();
const form = useTemplateRef<HTMLFormElement>('form');

const {
  guidelines,
  getCollectionAnnotationFields,
  getCollectionAnnotationConfig,
  getCollectionConfigFields,
  getAllCollectionConfigFields,
  getAvailableCollectionLabels,
  getAvailableCollectionAnnotationConfigs,
} = useGuidelinesStore();
const {
  activeCollection,
  isFetchingCollectionDetails,
  levels,
  mode: globalMode,
  pathToActiveCollection,
  createNewUrlPath,
  findCollectionInHierarchy,
  getUrlPath,
  removeTemporaryCollectionItems,
  restorePath,
  setMode,
  updateLevelsAndFetchData,
} = useCollectionManagerStore();

const { bookmarks, toggleBookmark } = useBookmarks();
const { createCollectionAnnotation: createAnnotation } = useCreateAnnotation('Collection');

const confirm = useConfirm();

const temporaryWorkData = ref<CollectionAccessStatusObject | null>(null);
const initialTemporaryWorkData = ref<CollectionAccessStatusObject | null>(null);

const temporaryTexts = ref<NodeStatusObject<TextNode>[]>([]);

// Responsible for setting inputs (non-)editable. The global mode
// determines the state of the page.
const formMode = computed<'view' | 'edit'>(() => {
  if (globalMode.value === 'create' || globalMode.value === 'edit') {
    return 'edit';
  } else {
    return 'view';
  }
});
const asyncOperationRunning = ref<boolean>(false);
const propertiesAreCollapsed = ref<boolean>(false);

const isBookmarked = computed<boolean>(() => {
  return bookmarks.value.some(
    b => b.data.data.uuid === temporaryWorkData.value?.collection.node.data.uuid,
  );
});

const selectedView = ref<TabView>('details');
const isTextsSelected = computed<boolean>(() => selectedView.value === 'texts');
const isDetailsSelected = computed<boolean>(() => selectedView.value === 'details');
const isAnnotationsSelected = computed<boolean>(() => selectedView.value === 'annotations');

const collectionFields: ComputedRef<PropertyConfig[]> = computed(() => {
  return guidelines.value
    ? getCollectionConfigFields(temporaryWorkData.value.collection.node.nodeLabels)
    : [];
});

const availableCollectionLabels = computed(getAvailableCollectionLabels);
const availabeAnnotationTypes: ComputedRef<AnnotationType[]> = computed(() =>
  getAvailableCollectionAnnotationConfigs(temporaryWorkData.value.collection.node.nodeLabels),
);

watch(
  () => activeCollection.value?.collection?.node.data.uuid,
  () => {
    temporaryWorkData.value = cloneDeep(activeCollection.value);
    initialTemporaryWorkData.value = cloneDeep(activeCollection.value);

    temporaryTexts.value = [];

    // In this case, the collection data is editable directly, meaning that the data need to be enriched
    if (globalMode.value === 'create') {
      enrichCollectionData();
    }
  },
  { immediate: true },
);

/**
 * Checks the validity of the Collection edit pane data and throws errors if criteria are not met.
 *
 * This function returns `true` when everything is ok, `false` if the native HTML form validation fails
 * and throws an error if the custom validation fails.
 *
 * @returns {boolean} Whether the collection data are valid.
 * @throws {AppError} If the collection data are not valid.
 */
function checkValidity(): boolean {
  // TODO: This is currently a mix of native HTML form validation and custom validation. Should be refactored
  // in the future (e.g. use the PrimeVue form validation).

  if (!form.value.reportValidity()) {
    return false;
  }

  // Collections must have and additional node label (if options exist)
  if (
    availableCollectionLabels.value.length > 0 &&
    temporaryWorkData.value.collection.node.nodeLabels.length === 0
  ) {
    throw new ValidationError('A Collection MUST have an additional node label.');
  }

  // Label property must always be a meaningful string
  const labelProp: string = temporaryWorkData.value.collection.node.data.label;

  if (labelProp === '') {
    throw new ValidationError('The "label" property must not be empty.');
  }

  if (labelProp.trim() === '') {
    throw new ValidationError(
      'The "label" property must not consist of only whitespace characters.',
    );
  }

  return true;
}

function clearTemporaryTexts(): void {
  temporaryTexts.value = [];
}

function deleteAnnotation(uuid: string): void {
  temporaryWorkData.value.annotations = temporaryWorkData.value.annotations.filter(
    a => a.node.data.uuid !== uuid,
  );
}

/**
 * Fills in any missing collection properties with the type-specific default value.
 *
 * Called when entering edit mode to create a full data object from which the dynamically rendered fields
 * can get their values from.
 *
 * @returns {void} This function does not return any value.
 */
function enrichCollectionData(): void {
  const allPossibleFields: PropertyConfig[] = getAllCollectionConfigFields();

  allPossibleFields.forEach(field => {
    if (!(field.name in temporaryWorkData.value.collection.node.data)) {
      temporaryWorkData.value.collection.node.data[field.name] =
        field?.required === true ? getDefaultValueForProperty(field.type) : null;
    }
  });
}

function handleAnnotationButtonClick(data: { type: string; subType?: string | number }) {
  const newAnnotation: NodeStatusObject = createAnnotation({
    ...data,
    nodeLabels: temporaryWorkData.value.collection.node.nodeLabels,
  });

  temporaryWorkData.value.annotations.push(newAnnotation);
}

function handleAddText(newText: NodeStatusObject<TextNode>) {
  newText.node.data.text = newText.node.data.text.replace(/(\r\n|\n|\r)/g, ' ');

  temporaryTexts.value = temporaryTexts.value.filter(
    t => t.node.data.uuid !== newText.node.data.uuid,
  );

  temporaryWorkData.value.texts.push(newText);
}

async function handleAddTextClick(): Promise<void> {
  const newText: NodeStatusObject<TextNode> = createNodeStatusObjectFromRawData(
    createNodeDtoFromNode(createTextNode()),
  ) as NodeStatusObject<TextNode>;

  if (!newText.node.nodeLabels.includes('Content')) {
    newText.node.nodeLabels.push('Content');
  }

  newText.meta.status = 'created';

  temporaryTexts.value.push(newText);
}

function handleClickEditButton(): void {
  enrichCollectionData();
  setMode('edit');
}

async function handleDiscardChanges(): Promise<void> {
  temporaryWorkData.value = cloneDeep(initialTemporaryWorkData.value);

  if (globalMode.value === 'create') {
    restorePath();
    updateLevelsAndFetchData(pathToActiveCollection.value);
  }

  removeTemporaryCollectionItems();
  clearTemporaryTexts();

  setMode('view');
}

function handleDeleteAnnotation(event: MouseEvent, uuid: string): void {
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
    accept: () => deleteAnnotation(uuid),
    reject: () => {},
  });
}

function handleRemoveText(text: NodeDto<TextNode>, status: 'existing' | 'temporary'): void {
  if (status === 'existing') {
    const textToRemove = temporaryWorkData.value.texts.find(
      t => t.node.data.uuid === text.node.data.uuid,
    );

    if (!textToRemove) {
      console.error(`Text with UUID ${text.node.data.uuid} not found in existing texts.`);
    }

    textToRemove.meta.status = 'removed';
  } else {
    temporaryTexts.value = temporaryTexts.value.filter(
      t => t.node.data.uuid !== text.node.data.uuid,
    );
  }
}

async function createCollection(): Promise<CollectionNode> {
  const parentCollection: CollectionNode | null =
    pathToActiveCollection.value[pathToActiveCollection.value.length - 2] ?? null;

  const creationData: CollectionCreationData = {
    ...temporaryWorkData.value,
    parentCollection,
  };

  await api.createOrAddCollection(creationData);

  const updateData: CollectionPostData = {
    data: temporaryWorkData.value,
    initialData: initialTemporaryWorkData.value,
  };

  const updated: CollectionNode = await api.updateCollection(
    temporaryWorkData.value.collection.node.data.uuid,
    updateData,
  );

  return updated;
}

function transferDataToListItem(uuid: string, index: number, data: NodeDto<CollectionNode>): void {
  // TODO: Make this more elegant
  const collectionObject: ColumnEntry | null = findCollectionInHierarchy(uuid, index);

  if (collectionObject) {
    collectionObject.data.node.data = data.node.data;
    collectionObject.data.node.nodeLabels = data.node.nodeLabels;
    collectionObject.status = 'existing';
  }
}

async function handleApplyChanges(): Promise<void> {
  // Handle errors in fronted to show warnings instead of errors coming from server

  try {
    if (!checkValidity()) {
      return;
    }
  } catch (error: unknown) {
    addToastMessage({
      severity: 'warn',
      summary: (error as AppError).name,
      detail: (error as AppError)?.message ?? '',
      life: 3000,
    });

    return;
  }

  const operationType: 'create' | 'update' = globalMode.value === 'create' ? 'create' : 'update';

  // TODO: Enable
  if (operationType === 'create') {
    addToastMessage({
      severity: 'info',
      summary: 'Not implemented',
      detail: 'Creating new Collections is not yet enabled.',
      life: 3000,
    });
    return;
  }

  asyncOperationRunning.value = true;

  try {
    // TODO: Implement Creating collections
    // const result: CollectionNode =
    //   globalMode.value === 'create' ? await createCollection() : await updateCollection();

    const result = await updateCollection();

    // Set returned collection data to column list item
    const pathIndex: number = pathToActiveCollection.value.length - 1;

    // Update column entry (data, status)
    transferDataToListItem(result.node.data.uuid, pathIndex, result);

    // Clean up pane data
    initialTemporaryWorkData.value = cloneDeep(temporaryWorkData.value);
    clearTemporaryTexts();

    // Update route when new collection was created (created collection must be in focus and children displayed)
    if (operationType === 'create') {
      router.push({ query: { path: createNewUrlPath(result.data.uuid, pathIndex) } });
    }

    showMessage('success');
    setMode('view');
  } catch (error: unknown) {
    showMessage('error', error as Error);
    console.error('Error updating collection:', error);
  } finally {
    asyncOperationRunning.value = false;
  }
}

function handleBookmarkAction(): void {
  toggleBookmark({ data: temporaryWorkData.value.collection.node, type: 'collection' });
}

async function handleDeleteColletion() {
  createModalInstance(
    dialog.open(CollectionDeleteModal, {
      props: {
        modal: true,
        closable: false,
        closeOnEscape: false,
        style: { width: '25rem' },
      },
      data: {
        action: 'delete',
        collection: temporaryWorkData.value,
      },
      emits: {
        onDeleted: handleSuccessfullDeletion,
      },
      onClose: destroyModalInstance,
    }),
  );
}

function handleSuccessfullDeletion() {
  showMessage('success');
  destroyModalInstance();
  updateView();
}

function updateView() {
  const currentUuids: string[] = getUrlPath();

  // Set returned collection data to column list item
  const pathIndex: number = pathToActiveCollection.value.length - 1;
  const newUuids: string[] = currentUuids.slice(0, pathIndex);

  router.push({ query: { path: newUuids.join(',') } });

  // Remove collection from level explicitly. This is not handled by the watcher since the watcher
  // either refetches completely or keeps the last level.
  levels.value[newUuids.length].collections = levels.value[newUuids.length].collections.filter(
    c => c.data.node.data.uuid !== temporaryWorkData.value.collection.node.data.uuid,
  );

  setMode('view');
}

/**
 * Called before saving the collection to remove any data entries that are not configured
 * according to the current node labels of the collection.
 *
 * This is necessary since on edit mode toggling the data object was filled with empty data entries temporarily
 * to form a data pool for the dynamically rendered input fields (see `enrichCollectionData`).
 *
 * @returns {void} This function does not return any value.
 */
function removeUnnecessaryDataBeforeSave(): void {
  // Get configured field names that are allowed to be saved
  const configuredFieldNames: string[] = getCollectionConfigFields(
    temporaryWorkData.value.collection.node.nodeLabels,
  ).map(f => f.name);

  // Remove data entries that are not configured
  Object.keys(temporaryWorkData.value.collection.node.data).forEach(key => {
    if (!configuredFieldNames.includes(key) && key !== 'uuid') {
      delete temporaryWorkData.value.collection.node.data[key];
    }
  });
}

function wrapDataInSingleStructure(data: CollectionAccessStatusObject) {
  const { collection, texts, annotations } = data;

  // Collection is set to "modified", along with all annotations. The annotation
  // status handling could be more fine granular, but this here makes things
  // easier (Collections won't have hundreds/thousands of annotations, query is
  // still performant)
  const freshCollection: NodeStatusObject = { ...collection, meta: { status: 'modified' } };
  const freshAnnotations: NodeStatusObject[] = annotations.map(a => {
    const newStatus = a.meta.status === 'unchanged' ? 'modified' : a.meta.status;

    return {
      ...a,
      meta: { status: newStatus },
    };
  });

  return {
    ...freshCollection,
    connectedNodes: [...texts, ...freshAnnotations],
  };
}

async function updateCollection(): Promise<NodeDto<CollectionNode>> {
  const updateObj = wrapDataInSingleStructure(temporaryWorkData.value!);

  // console.log(flattenNodeTree(updateObj));
  // TODO: Include this step
  // removeUnnecessaryDataBeforeSave();

  // const collectionPostData: CollectionPostData = {
  //   data: temporaryWorkData.value,
  //   initialData: initialTemporaryWorkData.value,
  // };

  const json = await api.updateCollection(
    temporaryWorkData.value.collection.node.data.uuid,
    updateObj,
  );

  return json;
}

function showMessage(result: 'success' | 'error', error?: Error) {
  addToastMessage({
    severity: result,
    summary: result === 'success' ? 'Changes saved successfully' : 'Error saving changes',
    detail: error?.message ?? '',
    life: 2000,
  });
}

function toggleViewMode(direction: TabView): void {
  selectedView.value = direction;
}
</script>

<template>
  <div
    v-if="temporaryWorkData && !isFetchingCollectionDetails"
    class="edit-pane-container h-full flex flex-column align-items-center text-center p-2"
  >
    <div class="main flex-grow-1 flex flex-column w-full">
      <div class="buttons text-right">
        <Button
          type="button"
          severity="secondary"
          :icon="`pi pi-bookmark${isBookmarked ? '-fill' : ''}`"
          size="small"
          :title="isBookmarked ? 'Remove collection from bookmarks' : 'Add collection to bookmarks'"
          @click="handleBookmarkAction"
          :pt="{
            icon: {
              style: isBookmarked ? { color: 'var(--p-primary-color)' } : {},
            },
          }"
        />
      </div>
      <div class="status-section h-2rem relative text-right">
        <Tag
          v-if="globalMode === 'create'"
          severity="success"
          value="New"
          icon="pi pi-sparkles"
          rounded
        ></Tag>
      </div>

      <div class="label-section">
        <h3 v-if="temporaryWorkData.collection.node.data.label">
          {{ temporaryWorkData.collection.node.data.label }}
        </h3>
        <h3 v-else class="font-italic font-normal">No label provided</h3>
      </div>

      <div class="tab-section pb-2">
        <ButtonGroup class="w-full flex">
          <ToggleButton
            :model-value="isDetailsSelected"
            class="w-full"
            onLabel="Details"
            offLabel="Details"
            onIcon="pi pi-info-circle"
            offIcon="pi pi-info-circle"
            title="Show Collection details"
            @change="toggleViewMode('details')"
          />
          <ToggleButton
            :model-value="isAnnotationsSelected"
            class="w-full"
            onLabel="Annotations"
            offLabel="Annotations"
            onIcon="pi pi-pencil"
            offIcon="pi pi-pencil"
            title="Show Annotations"
            @change="toggleViewMode('annotations')"
          />
          <ToggleButton
            :model-value="isTextsSelected"
            class="w-full"
            onLabel="Texts"
            offLabel="Texts"
            onIcon="pi pi-align-justify"
            offIcon="pi pi-align-justify"
            title="Show Texts"
            @change="toggleViewMode('texts')"
          />
        </ButtonGroup>
      </div>

      <div class="content">
        <div v-show="isDetailsSelected" class="properties-pane">
          <h3 class="text-center">Labels</h3>
          <div v-if="formMode === 'edit'" class="flex justify-content-center">
            <MultiSelect
              v-model="temporaryWorkData.collection.node.nodeLabels"
              :options="availableCollectionLabels"
              display="chip"
              :invalid="
                availableCollectionLabels.length > 0 &&
                temporaryWorkData.collection.node.nodeLabels.length === 0
              "
              title="Select node labels"
              placeholder="Select labels"
              :filter="false"
            >
              <template #chip="{ value }">
                <NodeTag :content="value" type="Collection" class="mr-1" />
              </template>
            </MultiSelect>
          </div>
          <div v-else class="flex gap-2 justify-content-center">
            <template
              v-if="temporaryWorkData.collection.node.nodeLabels.length > 0"
              v-for="label in temporaryWorkData.collection.node.nodeLabels"
              :key="label"
            >
              <NodeTag :content="label" type="Collection" class="mr-1" />
            </template>
            <div v-else>
              <i>This Collection has no labels yet.</i>
            </div>
          </div>

          <h3 class="text-center">Properties</h3>
          <form ref="form">
            <div class="input-container" v-for="field in collectionFields">
              <div class="flex align-items-center gap-3 mb-3">
                <label :for="field.name" class="w-10rem font-semibold"
                  >{{ capitalize(field.name) }}
                </label>
                <DataInputGroup
                  v-if="field.type === 'array'"
                  v-model="temporaryWorkData.collection.node.data[field.name]"
                  :config="field"
                  :mode="formMode"
                />
                <DataInputComponent
                  v-else
                  v-model="temporaryWorkData.collection.node.data[field.name]"
                  :config="field"
                  :mode="formMode"
                />
              </div>
            </div>
          </form>
        </div>

        <div v-show="isAnnotationsSelected" class="annotations-pane">
          <div v-if="formMode === 'edit'" class="annotation-button-pane flex flex-wrap gap-3 py-3">
            <AnnotationButton
              v-for="type in availabeAnnotationTypes"
              :type="type.type"
              :key="type.type"
              :disabled="(formMode as 'view' | 'edit') === 'view'"
              :config="
                getCollectionAnnotationConfig(
                  temporaryWorkData.collection.node.nodeLabels,
                  type.type,
                )
              "
              @clicked="handleAnnotationButtonClick($event)"
            />
          </div>

          <div
            v-if="formMode === 'view' && temporaryWorkData.annotations.length === 0"
            class="pt-4 font-italic"
          >
            This collection has no annotations yet.
          </div>

          <Panel
            v-for="annotation in temporaryWorkData.annotations"
            class="annotation-form mb-3"
            :data-annotation-uuid="annotation.node.data.uuid"
            toggleable
            :collapsed="true"
            :toggle-button-props="{
              severity: 'secondary',
              title: 'Toggle full view',
              rounded: true,
              text: true,
            }"
          >
            <template #header>
              <div class="flex items-center gap-1 align-items-center">
                <div class="icon-container">
                  <AnnotationTypeIcon :annotationType="annotation.node.data.type" />
                </div>
                <div class="annotation-type-container">
                  <span class="font-bold">{{ annotation.node.data.type }}</span>
                </div>
              </div>
              <NodeStatusBadge :status="annotation.meta.status" />
            </template>
            <template #toggleicon="{ collapsed }">
              <i :class="`pi pi-chevron-${collapsed ? 'down' : 'up'}`"></i>
            </template>
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
                :fields="
                  getCollectionAnnotationFields(
                    temporaryWorkData.collection.node.nodeLabels,
                    annotation.node.data.type,
                  )
                "
                :mode="formMode"
              />
            </Fieldset>
            <AnnotationFormAdditionalNodesSection
              v-model="annotation.connectedNodes"
              :mode="formMode"
              :annotation-config="
                getCollectionAnnotationConfig(
                  temporaryWorkData.collection.node.nodeLabels,
                  annotation.node.data.type,
                )
              "
            />
            <div class="action-buttons flex justify-content-center">
              <Button
                v-if="formMode === 'edit'"
                label="Delete"
                title="Delete annotation"
                severity="danger"
                icon="pi pi-trash"
                size="small"
                @click="handleDeleteAnnotation($event, annotation.node.data.uuid)"
              />
            </div>
            <ConfirmPopup></ConfirmPopup>
          </Panel>
        </div>
        <div v-show="isTextsSelected" class="texts-pane">
          <div
            v-if="formMode === 'view' && temporaryWorkData.texts.length === 0"
            class="pt-4 font-italic"
          >
            This collection has no texts yet.
          </div>
          <TextContainer
            v-for="text in temporaryWorkData.texts"
            :text="text"
            :mode="formMode"
            status="existing"
            @text-removed="handleRemoveText(text, 'existing')"
          />
          <TextContainer
            v-for="text in temporaryTexts"
            :text="text"
            :mode="formMode"
            status="temporary"
            @text-added="handleAddText(text)"
            @text-removed="handleRemoveText(text, 'temporary')"
          />
          <Button
            v-if="formMode === 'edit' && temporaryTexts.length === 0"
            class="mt-2 w-full h-2rem"
            icon="pi pi-plus"
            size="small"
            severity="secondary"
            label="Add text"
            title="Add new text"
            @click="handleAddTextClick"
          />
        </div>
      </div>
    </div>

    <div class="buttons flex justify-content-center gap-2">
      <Button
        v-if="formMode === 'view'"
        icon="pi pi-pencil"
        label="Edit"
        title="Edit collection"
        @click="handleClickEditButton"
      ></Button>
      <Button
        v-if="formMode === 'edit'"
        :loading="asyncOperationRunning"
        :icon="globalMode === 'create' ? 'pi pi-plus' : 'pi pi-save'"
        :label="globalMode === 'create' ? 'Create' : 'Save'"
        :title="globalMode === 'create' ? 'Create new collection' : 'Save changes'"
        @click="handleApplyChanges"
      ></Button>
      <Button
        v-if="formMode === 'edit'"
        :disabled="asyncOperationRunning"
        icon="pi pi-times"
        :title="globalMode === 'create' ? 'Discard collection' : 'Cancel changes'"
        :label="globalMode === 'create' ? 'Discard' : 'Cancel'"
        severity="secondary"
        @click="handleDiscardChanges"
      ></Button>
      <Button
        v-if="formMode === 'edit' && globalMode !== 'create'"
        :disabled="asyncOperationRunning"
        icon="pi pi-trash"
        label="Delete"
        title="Delete collection"
        severity="danger"
        @click="handleDeleteColletion"
      ></Button>
    </div>
  </div>

  <div
    v-if="isFetchingCollectionDetails"
    class="w-full h-full flex justify-content-center align-items-center"
  >
    <ProgressSpinner
      class="loading-spinner"
      style="width: 80px; height: 80px"
      strokeWidth="2"
      fill="transparent"
      animationDuration="1.5s"
      aria-label="Custom ProgressSpinner"
      :dt="{
        root: {
          colorOne: 'black',
          colorTwo: 'black',
          colorThree: 'black',
          colorFour: 'black',
        },
      }"
    />
  </div>

  <div
    v-if="!activeCollection"
    class="w-full h-full flex justify-content-center align-items-center font-italic"
  >
    <div class="text-center">
      <p>No Collection selected</p>
    </div>
  </div>
</template>

<style scoped>
.edit-pane-container {
  outline: 1px solid grey;
}

.annotation-form {
  border: 1px solid grey;
}

.edit-pane-container,
.edit-pane-container * {
  position: relative;
  z-index: var(--z-index-edit-pane);
}

.edit-pane-container,
.main {
  overflow-y: hidden;
}

.label-section {
  line-break: auto;
  min-height: 3rem;

  h3 {
    margin: 0;
  }
}

.content {
  flex-grow: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.icon-container {
  width: 20px;
  height: 20px;
}
</style>
