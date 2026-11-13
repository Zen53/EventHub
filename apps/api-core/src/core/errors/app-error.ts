import type { FieldError } from '@eventhub/schemas';

/** Business error, rendered by the global filter as `{ error: { code, message, details } }`. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: FieldError[] | null = null,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
