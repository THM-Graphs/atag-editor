import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { IGuidelines } from '../models/IGuidelines.js';
import { CollectionProperty } from '../models/types.js';

export default class GuidelinesService {
  /**
   * Retrieves field configuration of a collection of given type. Contains information about validation rules (required/not required).
   * Used for applying default data to to-be-created collections when they are missing
   *
   * @param {string} type - The type of the collection.
   * @return {Promise<CollectionProperty[]>} The field configurations for the collection type.
   */
  public async getCollectionFields(type: string): Promise<CollectionProperty[]> {
    const guidelines: IGuidelines = await this.getGuidelines();

    return guidelines.collections.find(c => c.type === type)?.properties ?? [];
  }

  /**
   * Retrieves the Edition guidelines from a JSON file.
   *
   * @return {Promise<IGuidelines>} A promise that resolves to the guidelines object.
   */
  public async getGuidelines(): Promise<IGuidelines> {
    // TODO: Fix file path creation
    const __filename: string = fileURLToPath(import.meta.url);
    const __dirname: string = dirname(__filename);
    const filePath: string = resolve(__dirname, '../../src/config/guidelines.json');

    const data: string = await fs.readFile(filePath, 'utf-8');
    const guidelines: IGuidelines = JSON.parse(data);

    return guidelines;
  }
}
