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
    const css: string = `:root {
  --aboveLine-clr: hsl(22, 81%, 35%);
  --additionLaterHand-color: hsla(91, 59%, 64%, 0.3);
  --belowLine-clr: hsl(22, 81%, 35%);
  --commentary-color: #e3dbcc99;
  --commentary-opacity: 0.9;
  --correction-clr: hsla(36, 85%, 76%, 0.6);
  --deleted-text-decoration: line-through;
  --deleted-clr: hsl(0, 0%, 44%);
  --expansion-clr: hsl(201, 22%, 87%);
  --expansion-opacity: 0.7;
  --gap-text-decoration: underline dotted;
  --head-font-weight: 700;
  --initial-clr: hsl(114, 100%, 37%);
  --marginNote-clr: hsl(34, 100%, 47%);
  --repeated-clr: #cbcbcb;
  --repeated-text-decoration: line-through;
  --rubricated-clr: hsl(0, 76%, 38%);
  --rubricated-font-weight: 700;
  --sic-clr: hsl(130, 99%, 29%);
  --transposition-clr: #ccc;
  --unclear-clr: hsl(328, 98%, 47%);
}

/* -------- TEXT ------------------------------------------------------------------------------------------------------------ */

#text span.emphasis {
  &:has(.rubricated) {
    font-weight: var(--rubricated-font-weight);
    color: var(--rubricated-clr);
  }

  &:has(.bold) {
    font-weight: bold;
    color: unset;
  }

  &:has(.bold) {
    font-weight: bold;
    color: unset;
  }

  &:has(.initial) {
    color: var(--initial-clr);
    font-weight: bold;
  }

  &:has(.italic) {
    font-style: italic;
  }

  &:has(.smallCaps) {
    text-decoration: dotted underline;
  }

  &:has(.underlined) {
    text-decoration: underline;
  }
}

#text span:has(.emphasised:where(.bold, .initial, .italic, .underlined, .smallCaps)) {
  font-weight: normal;
  color: unset;
}

#text span.expansion {
  background-color: var(--expansion-clr);
  opacity: var(--expansion-opacity);
}

#text span:has(.nonLinear) {
  &:has(.aboveLine) {
    color: var(--aboveLine-clr);
  }

  &:has(.belowLine) {
    color: var(--belowLine-clr);
  }

  &:has(.marginNote) {
    color: var(--marginNote-clr);
  }
}

#text span:has(.correction) {
  background-color: var(--correction-clr);
}

#text span:has(.deleted.start) {
  border-right: 2px solid var(--deleted-clr);
}
#text span:has(.deleted.end) {
  border-left: 2px solid var(--deleted-clr);
}

#text span:has(.unclear) {
  color: var(--unclear-clr);
}

#text span:has(.repeated) {
  background-color: var(--repeated-clr);
  text-decoration: var(--repeated-text-decoration);
}

#text span:has(.gap) {
  text-decoration: var(--gap-text-decoration);
}

#text span:has(.additionLaterHand) {
  background-color: var(--additionLaterHand-color);
}

#text span:has(.head) {
  font-weight: var(--head-font-weight);
}

#text span:has(.commentary) {
  background-color: var(--commentary-color);
  opacity: var(--commentary-opacity);
}

#text span:has(.line.start)::before {
  /* Disable stylings from span element... */
  background-color: white;
  color: black;
  font-weight: normal;
  opacity: 1;
  /* Curved arrow */
  content: '\x2937';
  white-space: pre;
  user-select: none;
}

#text span:has(.line.end)::after {
  /* Disable stylings from span element... */
  background-color: white;
  color: black;
  font-weight: normal;
  opacity: 1;
  /* Curved arrow, newline */
  content: '\x2936 \A';
  white-space: pre;
  user-select: none;
}

#text span.person {
  text-decoration: underline;
  text-decoration-color: hsl(358, 83%, 68%);
  text-decoration-thickness: 2px;
}

#text span:has(.entity.place) {
  text-decoration: underline;
  text-decoration-color: hsl(212, 93%, 54%);
  text-decoration-thickness: 2px;
}

#text span:has(.entity.concept) {
  text-decoration: underline;
  text-decoration-color: hsl(45, 90%, 60%);
  text-decoration-thickness: 2px;
}

#text span:has(.entity.event) {
  text-decoration: underline;
  text-decoration-color: hsl(134, 61%, 41%);
  text-decoration-thickness: 2px;
}

#text span:has(.entity.imagery) {
  text-decoration: underline;
  text-decoration-color: hsl(296, 72%, 66%);
  text-decoration-thickness: 2px;
}

#text span:has(.entity.reference) {
  text-decoration: underline;
  text-decoration-color: hsl(17, 22%, 50%);
  text-decoration-thickness: 2px;
}

#text span:has(.sic) {
  color: var(--sic-clr);
}

/* -------- ICONS ------------------------------------------------------------------------------------------------------------ */

.annotation-type-icon-entity {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/entity.svg');
}

.annotation-type-icon-emphasised {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/emphasised.svg');
}

.annotation-type-icon-expansion {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/expansion.svg');
}

.annotation-type-icon-nonLinear {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/nonLinear.svg');
}

.annotation-type-icon-correction {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/correction.svg');
}

.annotation-type-icon-deleted {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/deleted.svg');
}

.annotation-type-icon-unclear {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/unclear.svg');
}

.annotation-type-icon-repeated {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/repeated.svg');
}

.annotation-type-icon-gap {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/gap.svg');
}

.annotation-type-icon-additionLaterHand {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/additionLaterHand.svg');
}

.annotation-type-icon-head {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/head.svg');
}

.annotation-type-icon-line {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/line.svg');
}

.annotation-type-icon-transposition {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/transposition.svg');
}

.annotation-type-icon-commentary {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/commentary.svg');
}

.annotation-type-icon-sic {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/sic.svg');
}

.annotation-type-icon-sentPerson {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/sentPerson.svg');
}

.annotation-type-icon-receivedPerson {
  background-image: url('https://raw.githubusercontent.com/THM-Graphs/atag-editor/refs/heads/main/client/public/icons/receivedPerson.svg');
}

/* -------- TODO: Paragraph annotations, remove in the since not customizable...? ---------------------------------------- */

#text span:has(.paragraph.end)::after {
  /* This disables inherited styling from span element, must be set at first! */
  all: initial;
  content: ' ';
  width: 100%;
  height: 1.5rem;
  /* background-color: rgb(231, 231, 231); */
  display: block;
  white-space: pre;
  user-select: none;
}

#text span:has(.transposition) {
  background-color: var(--transposition-clr);
}
`;

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
