import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { IGuidelines } from '../models/IGuidelines.js';

export default class GuidelinesService {
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
