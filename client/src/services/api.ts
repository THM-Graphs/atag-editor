import { buildFetchUrl } from '../utils/helper/helper';
import { IGuidelines } from '../models/IGuidelines';

export default class ApiService {
  public async getGuidelines(): Promise<IGuidelines> {
    try {
      const url: string = buildFetchUrl(`/api/guidelines`);

      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const fetchedGuidelines: IGuidelines = await response.json();

      return fetchedGuidelines;
    } catch (error: unknown) {
      throw new Error(`Error fetching guidelines: ${error}`);
    }
  }
}
