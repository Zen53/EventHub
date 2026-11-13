import {
  StandardSchemaValidationPipe,
  type StandardSchemaValidationPipeOptions,
} from '@nestjs/common';
import { AppError } from '../errors/app-error.js';

type Issues = Parameters<NonNullable<StandardSchemaValidationPipeOptions['exceptionFactory']>>[0];

export interface FieldError {
  field: string;
  message: string;
}

export function toValidationDetails(issues: Issues): FieldError[] {
  return issues.map((issue) => ({
    field: (issue.path ?? [])
      .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
      .join('.'),
    message: issue.message,
  }));
}

export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) =>
      new AppError(400, 'VALIDATION_ERROR', 'Validation failed', toValidationDetails(issues)),
  });
}
