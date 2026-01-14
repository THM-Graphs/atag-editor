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
  CursorData,
  NetworkPostData,
  NodeAncestry,
  PaginationResult,
  Text,
  TextAccessObject,
} from '../models/types';
import IEntity from '../models/IEntity';
import DatabaseConnectionError from '../utils/errors/databaseConnection.error';
import ApiError from '../utils/errors/api.error';
import NotFoundError from '../utils/errors/notFound.error';
import ExternalServiceError from '../utils/errors/externalService.error';

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

  /**
   * Checks API response status  by throwing the appropriate error type if necessary.
   * Currently handles 404 (NotFound), 500 (Internal Server Error), and 503 (Database Connection Error) status codes.
   *
   * @param {Response} response - The response object from the API request.
   * @returns {Promise<void>} - A promise that resolves when the operation is complete.
   * @throws {NotFoundError} - If the API returns a 404 status code.
   * @throws {ApiError} - If the API returns a 500 status code.
   * @throws {ExternalServiceError} - If the API returns a 502 status code.
   * @throws {DatabaseConnectionError} - If the API returns a 503 status code.
   */
  private async assertResponseOk(response: Response): Promise<void> {
    if (!response.ok) {
      const body = await response.json().catch(() => null);

      switch (response.status) {
        case 404:
          throw new NotFoundError(response.status, body?.message || 'Not found');
        case 500:
          throw new ApiError(response.status, body?.message || 'Internal server error');
        case 502:
          throw new ExternalServiceError(
            response.status,
            body?.message || 'External service error',
          );
        case 503:
          throw new DatabaseConnectionError(
            response.status,
            body?.message || 'Database connection error',
          );
        default:
          throw new ApiError(response.status, body?.message || 'API response was not ok');
      }
    }
  }

  /**
   * Checks the health of the database connection.
   * Throws a DatabaseConnectionError if the API returns an error.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   * @throws {DatabaseConnectionError} If the database connection is unhealthy.
   */
  public async checkDatabaseConnection(): Promise<void> {
    try {
      const url: string = `${this.baseUrl}/health`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
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

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  public async deleteCollection(uuid: string): Promise<Collection> {
    try {
      const url: string = `${this.baseUrl}/collections/${uuid}`;

      const response: Response = await fetch(url, {
        method: 'DELETE',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        referrerPolicy: 'no-referrer',
      });

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  public async getAnnotations(
    nodeType: 'collection' | 'text',
    nodeUuid: string,
  ): Promise<AnnotationData[]> {
    try {
      const url: string = `${this.baseUrl}/${nodeType}s/${nodeUuid}/annotations`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  public async getCharacters(textUuid: string): Promise<Character[]> {
    try {
      const url: string = `${this.baseUrl}/texts/${textUuid}/characters`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  public async getCollection(collectionUuid: string): Promise<Collection> {
    try {
      const url: string = `${this.baseUrl}/collections/${collectionUuid}`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  public async getCollectionAncestry(collectionUuid: string): Promise<NodeAncestry[]> {
    try {
      const url: string = `${this.baseUrl}/collections/${collectionUuid}/ancestry`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  public async getCollections(
    parentUuid: string,
    params: {
      filters: DeepReadonly<CollectionSearchParams> | CollectionSearchParams;
      cursor: CursorData | null;
    },
  ): Promise<PaginationResult<Collection[]>> {
    const DEFAULT_ROW_COUNT: number | null = 10;

    const path: string = parentUuid
      ? `${this.baseUrl}/collections/${parentUuid}/collections`
      : `${this.baseUrl}/collections`;

    const urlParams: URLSearchParams = new URLSearchParams();

    const { filters, cursor } = params;

    urlParams.set('order', filters.sortDirection);
    urlParams.set('search', filters.searchInput);
    urlParams.set('nodeLabels', filters.nodeLabels.join(','));
    urlParams.set('limit', filters.rowCount?.toString() ?? DEFAULT_ROW_COUNT.toString());

    if (cursor) {
      urlParams.set('cursorUuid', cursor.uuid ?? '');
      urlParams.set('cursorLabel', cursor.label ?? '');
    }

    const fetchUrl: string = `${path}?${urlParams.toString()}`;

    try {
      const response: Response = await fetch(fetchUrl);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  public async getEntities(nodeLabel: string, searchString: string): Promise<IEntity[]> {
    try {
      const url: string = `${this.baseUrl}/entities?node=${nodeLabel}&searchStr=${searchString}`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }
  public async getGuidelines(): Promise<IGuidelines> {
    try {
      const url: string = `${this.baseUrl}/guidelines`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  public async getStyles(): Promise<string> {
    try {
      const url: string = `${this.baseUrl}/styles`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.text();
    } catch (error) {
      this.handleApiError(error);
    }
  }

  public async getTextAccessObject(textUuid: string): Promise<TextAccessObject> {
    try {
      const url: string = `${this.baseUrl}/texts/${textUuid}`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  public async getTexts(collectionUuid: string): Promise<Text[]> {
    try {
      const url: string = `${this.baseUrl}/collections/${collectionUuid}/texts`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  /**
   * Handles an API error by logging it to the console and rethrowing it.
   *
   * Called in every `catch` block of the `ApiService` methods. The rethrowing allows the error
   * to propagate up the call stack and be caught by a higher-level error handler.
   *
   * @param {ApiError | unknown} error - The error object to handle.
   * @returns {void} This function does not return any value.
   *
   * @throws {ApiError} - The API error (either the original or a subclass of it).
   */
  private handleApiError(error: ApiError | unknown): void {
    console.error(error);

    throw error;
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

      await this.assertResponseOk(response);
    } catch (error: unknown) {
      this.handleApiError(error);
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

      await this.assertResponseOk(response);
    } catch (error: unknown) {
      this.handleApiError(error);
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

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
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

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }

  public async validateCollectionPath(uuidString: string): Promise<Collection[]> {
    try {
      const url: string = `${this.baseUrl}/network?path=${uuidString}`;

      const response: Response = await fetch(url);

      await this.assertResponseOk(response);

      return await response.json();
    } catch (error: unknown) {
      this.handleApiError(error);
    }
  }
}
