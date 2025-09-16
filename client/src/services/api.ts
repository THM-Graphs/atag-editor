import { buildFetchUrl } from '../utils/helper/helper';
import { IGuidelines } from '../models/IGuidelines';
import { CollectionPreview, PaginationResult } from '../models/types';

export default class ApiService {
  public async getGuidelines(): Promise<IGuidelines> {
    try {
      const url: string = buildFetchUrl(`/api/guidelines`);

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

  public async getCollections(url: string): Promise<PaginationResult<CollectionPreview[]>> {
    try {
      const fetchUrl: string = buildFetchUrl(url);

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
}
