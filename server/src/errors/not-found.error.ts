export default class NotFoundError extends Error {
  public code: number;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    this.code = 404;
  }
}
