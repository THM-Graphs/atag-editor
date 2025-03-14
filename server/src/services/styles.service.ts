import NotFoundError from '../errors/not-found.error.js';

export default class StylesService {
  /**
   * Retrieves the stylesheet from the URL defined in the STYLESHEET_URL environment variable.
   *
   * @throws {NotFoundError} If the URL is not provided or if the stylesheet could not be loaded.
   * @return {Promise<string>} The retrieved stylesheet as raw CSS.
   */
  public async getStyles(): Promise<string> {
    // TODO: Improve error handling...
    const url: string | undefined = process.env.STYLESHEET_URL;

    if (!url) {
      throw new NotFoundError(`URL to stylesheet is not provided...`);
    }

    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new NotFoundError(`Styles could not be loaded`);
    }

    const styles: string = await response.text();

    return styles;
  }
}
