import { computed, ref } from 'vue';
import { Collection, CollectionAccessObject, Level } from '../models/types';

const baseCollections = [
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
];

const levels = ref<Level[]>([
  {
    data: baseCollections,
    activeUuid: null,
    level: 0,
  },
]);

const activeCollection = ref<CollectionAccessObject | null>(null);
const pathToActiveCollection = computed<Collection[]>(() => {
  if (!activeCollection.value) {
    return [];
  }

  let items = [];

  for (const level of levels.value) {
    const activeInColumn: Collection | null = level.data.find(
      c => c.data.uuid === level.activeUuid,
    );

    if (activeInColumn) {
      items.push(activeInColumn);
    }

    if (level.activeUuid === activeCollection.value?.collection?.data?.uuid) {
      break;
    }
  }

  return items;
});

const asyncOperationRunning = ref<boolean>(false);

export function useCollectionManagerStore() {
  async function fetchCollections(index: number, uuid: string): Promise<Collection[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (index === null && uuid === null) {
      return baseCollections;
    }

    const number = Math.random() * 10 + 1;

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
            text: '1162 September 7, Saint-Jean-de-Losne Friedrich teilt dem Klerus und allen Angehörigen der Kirche von Genf',
          },
          nodeLabels: ['Introduction'],
        },
        {
          data: {
            uuid: crypto.randomUUID() as string,
            text: '1162 September 7, Saint-Jean-de-Losne Friedrich teilt dem Klerus und allen Angehörigen der Kirche von Genf',
          },
          nodeLabels: ['Text'],
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

  async function reset(): Promise<void> {
    const newChildrenCollections: Collection[] = await fetchCollections(null, null);

    setCollectionActive(null);

    // Set levels to initial
    levels.value = [
      {
        activeUuid: null,
        level: 0,
        data: newChildrenCollections,
      },
    ];
  }

  function setCollectionActive(cao: CollectionAccessObject): void {
    activeCollection.value = cao;
  }

  return {
    asyncOperationRunning,
    levels,
    pathToActiveCollection,
    activeCollection,
    fetchCollections,
    fetchCollectionDetails,
    activateCollection,
    reset,
    setCollectionActive,
  };
}
