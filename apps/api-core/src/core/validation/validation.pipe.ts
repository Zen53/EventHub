import {
  type ArgumentMetadata,
  StandardSchemaValidationPipe,
  type StandardSchemaValidationPipeOptions,
} from '@nestjs/common';
import type { FieldError } from '@eventhub/schemas';
import { AppError } from '../errors/app-error.js';

type Issues = Parameters<
  NonNullable<StandardSchemaValidationPipeOptions['exceptionFactory']>
>[0];

const UNKNOWN_FIELD_MESSAGE = "Ce champ n'est pas autorisé.";

function joinPath(issue: Issues[number]): string {
  return (issue.path ?? [])
    .map((segment) =>
      String(typeof segment === 'object' ? segment.key : segment),
    )
    .join('.');
}

function unrecognizedKeys(issue: Issues[number]): string[] | undefined {
  if (!('code' in issue) || issue.code !== 'unrecognized_keys') return;
  return 'keys' in issue && Array.isArray(issue.keys) && issue.keys.length > 0
    ? issue.keys.map(String)
    : undefined;
}

export function toValidationDetails(issues: Issues): FieldError[] {
  return issues.flatMap((issue) => {
    const path = joinPath(issue);
    const keys = unrecognizedKeys(issue);
    if (!keys) return [{ field: path, message: issue.message }];
    return keys.map((key) => ({
      field: path ? `${path}.${key}` : key,
      message: UNKNOWN_FIELD_MESSAGE,
    }));
  });
}

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
      if (!parameter || !(error instanceof AppError) || !error.details)
        throw error;
      const details = error.details.map(({ field, message }) => ({
        field: field ? `${parameter}.${field}` : parameter,
        message,
      }));
      throw new AppError(error.status, error.code, error.message, details);
    }
  }
}

export function createValidationPipe(): StandardSchemaValidationPipe {
  return new AppValidationPipe();
}
