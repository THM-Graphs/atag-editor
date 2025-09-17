import { DeepReadonly } from 'vue';
import { IGuidelines } from '../models/IGuidelines';
import {
  Collection,
  CollectionPreview,
  CollectionSearchParams,
  PaginationResult,
} from '../models/types';

export default class ApiService {
  /** The base URL of the API */
  private baseUrl: string;

  /** The API prefix (e.g. '/api') */
  private apiPrefix: string;

  constructor() {
    this.apiPrefix = '/api';
    this.baseUrl = this.buildBaseUrl();
  }

  /**
   * Builds the base URL of the API depending on the environment.
   *
   * In development mode, the URL is constructed with protocol and host before the API prefix.
   * In production mode, the API prefix is used as is (handled by proxy servers like nginx).
   *
   * @returns {string} The built base URL.
   */
  private buildBaseUrl(): string {
    if (import.meta.env.MODE === 'development') {
      // Used for development currently, fix in future with vite configuration
      return `${import.meta.env.VITE_PROTOCOL}://${import.meta.env.VITE_APP_HOST}:8080${this.apiPrefix}`;
    }

    // For production, use relative URL and leave configuration to nginx
    return this.apiPrefix;
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
    }
  }

  public async getCollections(
    parentUuid: string,
    params: DeepReadonly<CollectionSearchParams> | CollectionSearchParams,
  ): Promise<PaginationResult<CollectionPreview[]>> {
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
}
