import fs from 'fs/promises';
import path from 'path';
import ExternalServiceError from '../errors/externalService.error.js';
import { isValidConfigFile, isValidHttpUrl } from '../utils/helper.js';
import { CONFIG_DIR } from '../constants.js';

export default class StylesService {
  /**
   * Retrieves the stylesheet from the URL defined in the STYLESHEET_URL environment variable. Can be either loaded
   * from a remote location or from the file system.
   *
   * @throws {ExternalServiceError} If the URL is not provided or if the stylesheet could not be loaded.
   * @return {Promise<string>} The retrieved stylesheet as raw CSS.
   */
  public async getStyles(): Promise<string> {
    // TODO: Improve error handling...technically a local file read error is not a external service error
    const url: string | undefined = process.env.STYLESHEET_URL;

    if (!url) {
      throw new ExternalServiceError(`URL to stylesheet is not provided`);
    }

    // If it starts with http/https, fetch it
    if (isValidHttpUrl(url)) {
      try {
        const response: Response = await fetch(url);

        if (!response.ok) {
          throw new ExternalServiceError(`Styles could not be loaded from remote url`);
        }

        const styles: string = await response.text();

        return styles;
      } catch (error: unknown) {
        throw new ExternalServiceError(`Styles could not be loaded from remote url`);
      }
    }

    if (!isValidConfigFile(url)) {
      throw new ExternalServiceError(`Provided stylesheet URL is not a valid file name.`);
    }

    // Else, read from local file system
    const filePath: string = path.join(CONFIG_DIR, url);

    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (err: unknown) {
      throw new ExternalServiceError(`Failed to read styles from file from the provided file `);
    }
  }
}
