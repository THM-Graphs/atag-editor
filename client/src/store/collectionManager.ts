import { ref } from 'vue';
import { Collection, CollectionAccessObject, Level } from '../models/types';

const levels = ref<Level[]>([
  {
    data: [
      {
        nodeLabels: ['Project'],
        data: {
          uuid: 'ri',
          label: 'ri',
          sentBy: 'max',
          receivedBy: 'max',
          status: 'test',
        },
      },
      {
        nodeLabels: ['Project'],
        data: {
          uuid: 'hild',
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
]);

const activeCollection = ref<CollectionAccessObject | null>(null);

async function fetchCollections(index: number, uuid: string): Promise<Collection[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const number = Math.random() * 6 + 1;

  let i = 0;
  const collections = [];

  while (i <= number) {
    collections.push({
      nodeLabels: ['Letter'],
      data: {
        uuid: index + '-' + i,
        label: index + '-' + i,
        sentBy: 'max',
        receivedBy: 'max',
        status: 'test',
      },
    });

    i++;
  }

  return collections;
}

async function fetchCollectionDetails(
  index: number,
  uuid: string,
): Promise<CollectionAccessObject> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const selectedCollection = levels.value[index].data.find(c => c.data.uuid === uuid);

  const cao: CollectionAccessObject = {
    collection: selectedCollection,
    texts: [
      {
        data: {
          uuid: crypto.randomUUID() as string,
          text: 'Here is some text',
        },
        nodeLabels: [],
      },
      {
        data: {
          uuid: crypto.randomUUID() as string,
          text: 'Here is some text',
        },
        nodeLabels: [],
      },
    ],
    annotations: [],
  };

  return cao;
}

async function activateCollection(index: number, uuid: string): Promise<void> {
  const newChildrenCollections = await fetchCollections(index + 1, uuid);
  const cao: CollectionAccessObject = await fetchCollectionDetails(index, uuid);

  // Remove levels AFTER index and replace the first new level with fetched data
  levels.value = [
    ...levels.value.slice(0, index + 1),
    {
      activeUuid: null,
      level: 0,
      data: newChildrenCollections,
    },
  ];

  levels.value[index].activeUuid = uuid;

  activeCollection.value = cao;
}

export function useCollectionManagerStore() {
  return {
    levels,
    activeCollection,
    fetchCollections,
    fetchCollectionDetails,
    activateCollection,
  };
}
