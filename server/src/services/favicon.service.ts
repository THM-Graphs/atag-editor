import NotFoundError from '../errors/notFound.error.js';
import { FaviconResponse } from '../models/types.js';

export default class FaviconService {
  /**
   * Retrieves the favicon from the URL defined in the FAVICON_URL environment variable.
   *
   * @throws {NotFoundError} If the URL is not provided or if the favicon could not be loaded.
   * @return {Promise<FaviconResponse>} The retrieved favicon as a raw buffer with its content type.
   */
  public async getFavicon(): Promise<FaviconResponse> {
    const url: string | undefined = process.env.FAVICON_URL;

    if (!url) {
      throw new NotFoundError('URL to favicon is not provided');
    }

    const response: Response = await fetch(url);

    // Same here, not really a problem if icon is not found
    if (!response.ok) {
      throw new NotFoundError('Favicon not found under url: ');
    }

    const contentType: string = response.headers.get('Content-Type') ?? this.inferContentType(url);
    const arrayBuffer: ArrayBuffer = await response.arrayBuffer();

    // Convert all received data to buffer
    const data: Buffer = Buffer.from(arrayBuffer);

    return { contentType, data };
  }

  /**
   * Infers the content type of a favicon based on its URL.
   *
   * If the URL does not match any of the above, the content type defaults to `image/x-icon`.
   *
   * @param {string} url The URL of the favicon.
   * @return {string} The inferred content type of the favicon.
   */
  private inferContentType(url: string): string {
    if (url.endsWith('.ico')) {
      return 'image/x-icon';
    } else if (url.endsWith('.png')) {
      return 'image/png';
    } else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
      return 'image/jpeg';
    } else if (url.endsWith('.svg')) {
      return 'image/svg+xml';
    }

    return 'image/x-icon';
  }
}
