import {
  errorCatalog,
  type ErrorCode,
  type FieldError,
} from '@eventhub/schemas';

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    readonly details: FieldError[] | null = null,
  ) {
    super(errorCatalog[code].message);
    this.name = 'AppError';
    this.status = errorCatalog[code].status;
  }
}
