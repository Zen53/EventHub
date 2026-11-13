import {
  type ArgumentMetadata,
  StandardSchemaValidationPipe,
  type StandardSchemaValidationPipeOptions,
} from '@nestjs/common';
import { AppError } from '../errors/app-error.js';

type Issues = Parameters<
  NonNullable<StandardSchemaValidationPipeOptions['exceptionFactory']>
>[0];

export interface FieldError {
  field: string;
  message: string;
}

export function toValidationDetails(issues: Issues): FieldError[] {
  return issues.map((issue) => ({
    field: (issue.path ?? [])
      .map((segment) =>
        String(typeof segment === 'object' ? segment.key : segment),
      )
      .join('.'),
    message: issue.message,
  }));
}

/** Validation errors carry the parameter name, so `@Param('id', { schema })` reports `field: 'id'`. */
class AppValidationPipe extends StandardSchemaValidationPipe {
  constructor() {
    super({
      exceptionFactory: (issues) =>
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Validation failed',
          toValidationDetails(issues),
        ),
    });
  }

  override async transform<T = any>(
    value: T,
    metadata: ArgumentMetadata,
  ): Promise<T> {
    try {
      return await super.transform(value, metadata);
    } catch (error) {
      const parameter = metadata.data;
      if (
        !parameter ||
        !(error instanceof AppError) ||
        !Array.isArray(error.details)
      )
        throw error;
      const details = (error.details as FieldError[]).map(
        ({ field, message }) => ({
          field: field ? `${parameter}.${field}` : parameter,
          message,
        }),
      );
      throw new AppError(error.status, error.code, error.message, details);
    }
  }
}

export function createValidationPipe(): StandardSchemaValidationPipe {
  return new AppValidationPipe();
}
