/** Business error, rendered by the global filter as `{ error: { code, message, details } }`. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
