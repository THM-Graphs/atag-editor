import { readonly, ref } from 'vue';
import ApiService from '../services/api';
import { useStyleTag } from '@vueuse/core';
import { useGuidelinesStore } from './guidelines';
import { DynamicDialogInstance } from 'primevue/dynamicdialogoptions';
import DatabaseConnectionError from '../utils/errors/databaseConnection.error';

const { error: guidelinesError, initializeGuidelines } = useGuidelinesStore();

// Data
const api: ApiService = new ApiService();

// Modals anywhere in the app are set to this variable
const activeModal = ref<DynamicDialogInstance>(null);

// Fetch status
const isFetching = ref<boolean>(false);
const error = ref<DatabaseConnectionError | unknown>(null);

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
    try {
      const css: string = await api.getStyles();

      useStyleTag(css, { id: 'custom-styles' });
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error loading stylesheet:', error);
    }
  }

  /**
   * Fetches the guidelines and initializes the store with the fetched data.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async function fetchAndInitializeGuidelines(): Promise<void> {
    try {
      const guidelines = await api.getGuidelines();

      initializeGuidelines(guidelines);
    } catch (e: unknown) {
      error.value = e as Error;
      console.error('Error fetching guidelines:', e);
    }
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
      error.value = e;
    } finally {
      isFetching.value = false;
    }
  }

  return {
    activeModal: readonly(activeModal),
    api: readonly(api),
    error: readonly(error),
    isFetching: readonly(isFetching),
    createModalInstance,
    destroyModalInstance,
    initializeApp,
  };
}
