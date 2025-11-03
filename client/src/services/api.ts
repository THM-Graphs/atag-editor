import { DeepReadonly } from 'vue';
import { IGuidelines } from '../models/IGuidelines';
import {
  Annotation,
  AnnotationData,
  Character,
  CharacterPostData,
  Collection,
  CollectionCreationData,
  CollectionPostData,
  CollectionSearchParams,
  NetworkPostData,
  NodeAncestry,
  PaginationResult,
  Text,
  TextAccessObject,
} from '../models/types';
import IEntity from '../models/IEntity';

/**
 * The ApiService class provides methods for making API requests to the backend server.
 */
export default class ApiService {
  /** The base URL of the API */
  private baseUrl: string;

  constructor() {
    // Earlier built with a function, but now managed by Vite proxy configuration
    this.baseUrl = '/api';
  }

  public async createCollection(data: CollectionCreationData): Promise<Collection> {
    try {
      const url: string = `${this.baseUrl}/collections`;

      const response: Response = await fetch(url, {
        method: 'POST',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error creating collection:', error);
      throw new Error(`Error creating collection: ${error}`);
    }
  }

  public async getAnnotations(
    nodeType: 'collection' | 'text',
    nodeUuid: string,
  ): Promise<AnnotationData[]> {
    try {
      const url: string = `${this.baseUrl}/${nodeType}s/${nodeUuid}/annotations`;

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error fetching annotations for collection:', error);
      throw new Error(`Error fetching annotations: ${error}`);
    }
  }

  public async getCharacters(textUuid: string): Promise<Character[]> {
    try {
      const url: string = `${this.baseUrl}/texts/${textUuid}/characters`;

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error fetching characters:', error);
      throw new Error(`Error fetching characters: ${error}`);
    }
  }

  public async getCollection(collectionUuid: string): Promise<Collection> {
    try {
      const url: string = `${this.baseUrl}/collections/${collectionUuid}`;

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error fetching collection:', error);
      throw new Error(`Error fetching collection: ${error}`);
    }
  }

  public async getCollectionAncestry(collectionUuid: string): Promise<NodeAncestry> {
    try {
      const url: string = `${this.baseUrl}/collections/${collectionUuid}/ancestry`;

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error fetching node ancestry:', error);
      throw new Error('Error fetching node ancestry:', error);
    }
  }

  public async getCollections(
    parentUuid: string,
    params: DeepReadonly<CollectionSearchParams> | CollectionSearchParams,
  ): Promise<PaginationResult<Collection[]>> {
    const DEFAULT_ROW_COUNT: number | null = 10;

    const path: string = parentUuid
      ? `${this.baseUrl}/collections/${parentUuid}/collections`
      : `${this.baseUrl}/collections`;

    const urlParams: URLSearchParams = new URLSearchParams();

    urlParams.set('sort', params.sortField);
    urlParams.set('order', params.sortDirection);
    urlParams.set('skip', params.offset.toString());
    urlParams.set('search', params.searchInput);
    urlParams.set('nodeLabels', params.nodeLabels.join(','));

    // Use default limit if none is provided
    urlParams.set('limit', params.rowCount?.toString() ?? DEFAULT_ROW_COUNT.toString());

    const fetchUrl: string = `${path}?${urlParams.toString()}`;

    try {
      const response: Response = await fetch(fetchUrl);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error fetching collections:', error);
      throw new Error(`Error fetching collections: ${error}`);
    }
  }

  public async getEntities(nodeLabel: string, searchString: string): Promise<IEntity[]> {
    try {
      const url: string = `${this.baseUrl}/entities?node=${nodeLabel}&searchStr=${searchString}`;

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error fetching entities:', error);
      throw new Error(`Error fetching entities: ${error}`);
    }
  }
  public async getGuidelines(): Promise<IGuidelines> {
    try {
      const url: string = `${this.baseUrl}/guidelines`;

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error fetching guidelines:', error);
      throw new Error(`Error fetching guidelines: ${error}`);
    }
  }

  public async getStyles(): Promise<string> {
    try {
      const url: string = `${this.baseUrl}/styles`;

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to load stylesheet');
      }

      return await response.text();
    } catch (error) {
      console.error('Error loading stylesheet:', error);
      throw new Error(`Error loading stylesheet: ${error}`);
    }
  }

  public async getTextAccessObject(textUuid: string): Promise<TextAccessObject> {
    try {
      const url: string = `${this.baseUrl}/texts/${textUuid}`;

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error fetching text:', error);
      throw new Error(`Error fetching text: ${error}`);
    }
  }

  public async getTexts(collectionUuid: string): Promise<Text[]> {
    try {
      const url: string = `${this.baseUrl}/collections/${collectionUuid}/texts`;

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error fetching texts for collection:', error);
      throw new Error(`Error fetching texts for collection: ${error}`);
    }
  }

  public async updateAnnotations(textUuid: string, annotationsToSave: Annotation[]): Promise<void> {
    try {
      const url: string = `${this.baseUrl}/texts/${textUuid}/annotations`;

      const response: Response = await fetch(url, {
        method: 'POST',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(annotationsToSave),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
    } catch (error: unknown) {
      console.error('Error updating annotations', error);
      throw new Error('Error updating annotations', error);
    }
  }

  public async updateCharacterChain(
    textUuid: string,
    characterPostData: CharacterPostData,
  ): Promise<void> {
    try {
      const url: string = `${this.baseUrl}/texts/${textUuid}/characters`;

      const response: Response = await fetch(url, {
        method: 'POST',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(characterPostData),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
    } catch (error: unknown) {
      console.log('Error updating character chain:', error);
      throw new Error('Error updating character chain:', error);
    }
  }

  public async updateCollection(uuid: string, data: CollectionPostData): Promise<Collection> {
    const url: string = `${this.baseUrl}/collections/${uuid}`;

    try {
      const response: Response = await fetch(url, {
        method: 'POST',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.log('Error updating collection:', error);
      throw new Error('Could not be saved, try again...', error);
    }
  }

  public async updateNetwork(data: NetworkPostData): Promise<(Collection | Text)[]> {
    const url: string = `${this.baseUrl}/network`;

    try {
      const response: Response = await fetch(url, {
        method: 'POST',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error updating network:', error);
      throw new Error('Network could not be updated, try again...');
    }
  }

  public async validateCollectionPath(uuidString: string): Promise<Collection[]> {
    try {
      const url: string = `${this.baseUrl}/network?path=${uuidString}`;

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error validating path:', error);
      throw new Error(`Error validating path: ${error}`);
    }
  }
}
