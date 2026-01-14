import { readonly, ref } from 'vue';
import ApiService from '../services/api';
import { useStyleTag } from '@vueuse/core';
import { useGuidelinesStore } from './guidelines';
import { DynamicDialogInstance } from 'primevue/dynamicdialogoptions';
import { ToastMessageOptions, ToastServiceMethods } from 'primevue';
import AppError from '../utils/errors/app.error';

const { error: guidelinesError, initializeGuidelines } = useGuidelinesStore();

// Data
const api: ApiService = new ApiService();

// Modals anywhere in the app are set to this variable
const activeModal = ref<DynamicDialogInstance>(null);

// App-wide toast service
const toast = ref<ToastServiceMethods>(null);

// Fetch status
const isFetching = ref<boolean>(false);
const error = ref<AppError>(null);

/**
 * Returns an object containing methods for fetching data from the API and initializing the application.
 *
 * The object contains the following methods:
 *   - `fetchAndApplyStyles`: Fetches the custom stylesheet and applies it to the document.
 *   - `fetchAndInitializeGuidelines`: Fetches the guidelines and initializes the store with the fetched data.
 *   - `initializeApp`: Initializes the application by fetching guidelines, styles, configuration etc.
 *
 * The object also contains the following properties:
 *   - `api`: The API instance.
 *   - `error`: The error of the last operation.
 *   - `isFetching`: Whether the store is currently fetching data.
 */
export function useAppStore() {
  /**
   * Adds a toast message to the toast service.
   *
   * @param {ToastMessageOptions} params - The options for the toast message to add.
   * @returns {void} This function does not return any value.
   */
  function addToastMessage(params: ToastMessageOptions): void {
    if (!toast.value) {
      console.warn('Toast service is not registered yet.');
      return;
    }

    toast.value.add(params);
  }

  /**
   * Sets the active modal instance to the provided PrimeVue DynamicDialog instance.
   *
   * Typically called when a modal is opened.
   *
   * @param {DynamicDialogInstance} instance - The modal instance to set as active.
   * @returns {void} This function does not return any value.
   */
  function createModalInstance(instance: DynamicDialogInstance): void {
    activeModal.value = instance;
  }

  /**
   * Destroys the active modal instance.
   *
   * Typically called when a modal is closed.
   *
   * @returns {void} This function does not return any value.
   */
  function destroyModalInstance(): void {
    activeModal.value = null;
  }

  /**
   * Fetches the custom stylesheet and applies it to the document.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async function fetchAndApplyStyles(): Promise<void> {
    const css: string = await api.getStyles();

    useStyleTag(css, { id: 'custom-styles' });
  }

  /**
   * Fetches the guidelines and initializes the store with the fetched data.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async function fetchAndInitializeGuidelines(): Promise<void> {
    const guidelines = await api.getGuidelines();

    initializeGuidelines(guidelines);
  }

  /**
   * Checks the status of the database connection.
   *
   * This function is called when the application is mounted.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async function checkDatabaseStatus(): Promise<void> {
    await api.checkDatabaseConnection();
  }

  /**
   * Initializes the application by fetching guidelines, styles, configuration etc.
   *
   * This function is called when the application is mounted.
   *
   * @returns {Promise<void>} This function does not return a value.
   */
  async function initializeApp(): Promise<void> {
    isFetching.value = true;

    try {
      await checkDatabaseStatus();
      await fetchAndInitializeGuidelines();
      await fetchAndApplyStyles();

      if (guidelinesError.value) {
        throw guidelinesError.value;
      }
    } catch (e: unknown) {
      error.value = e as AppError;
    } finally {
      isFetching.value = false;
    }
  }

  /**
   * Registers the toast service by setting the store ref to the provided service.
   *
   * This function is called when the App.vue component is mounted since the useToast composable (which returns the
   * toast passed into the function) can only be used inside a component setup function.
   *
   * @param {ToastServiceMethods} toastService - The toast service to register.
   * @returns {void} This function does not return a value.
   */
  function registerToast(toastService: ToastServiceMethods): void {
    toast.value = toastService;
  }

  return {
    activeModal: readonly(activeModal),
    api: readonly(api),
    error: readonly(error),
    isFetching: readonly(isFetching),
    addToastMessage,
    createModalInstance,
    destroyModalInstance,
    initializeApp,
    registerToast,
  };
}
