import { ref } from 'vue';
import { Level } from '../models/types';

const levels = ref<Level[]>([
  {
    data: [
      {
        nodeLabels: ['Project'],
        data: {
          uuid: 'f4a0af88-aa03-42e2-b322-060a7388eb59',
          label: 'RI',
          sentBy: 'max',
          receivedBy: 'max',
          status: 'test',
        },
      },
      {
        nodeLabels: ['Project'],
        data: {
          uuid: 'asdf-aa03-42e2-b322-060a7388eb59',
          label: 'Hildegard',
          sentBy: 'max',
          receivedBy: 'max',
          status: 'test',
        },
      },
    ],
    activeUuid: null,
    level: 0,
  },
  {
    data: [
      {
        nodeLabels: ['Manuscript'],
        data: {
          uuid: 'f4a0af88-a43s3-42e2-b322-060a7388eb59',
          label: 'Wr',
          sentBy: 'max',
          receivedBy: 'max',
          status: 'test',
        },
      },
      {
        nodeLabels: ['Mauscript'],
        data: {
          uuid: 'asdf-aa03-42e2-b322-060a7388xw59',
          label: 'R',
          sentBy: 'max',
          receivedBy: 'max',
          status: 'test',
        },
      },
    ],
    activeUuid: null,
    level: 1,
  },
  {
    data: [
      {
        nodeLabels: ['Letter'],
        data: {
          uuid: 'f4a0af88-a43s3-42e2-b322-06090088eb59',
          label: 'Brief 1',
          sentBy: 'max',
          receivedBy: 'max',
          status: 'test',
        },
      },
      {
        nodeLabels: ['Letter'],
        data: {
          uuid: 'asdf-aa23-42e2-b322-060a73x88xw59',
          label: 'Brief 2',
          sentBy: 'max',
          receivedBy: 'max',
          status: 'test',
        },
      },
    ],
    activeUuid: null,
    level: 2,
  },
]);

export function useCollectionManagerStore() {
  return {
    levels,
  };
}
