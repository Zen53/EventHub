import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ErrorResponse } from '@eventhub/schemas';
import type { Response } from 'express';
import { AppError } from './app-error.js';

export function toErrorResponse(exception: unknown): {
  status: number;
  body: ErrorResponse;
} {
  if (exception instanceof AppError) {
    const { status, code, message, details } = exception;
    return {
      status,
      body: { error: { code, message, details } },
    };
  }
  if (exception instanceof HttpException && exception.getStatus() < 500) {
    const status = exception.getStatus();
    const code = (HttpStatus[status] as string | undefined) ?? 'HTTP_ERROR';
    // An HttpException built from an Error would carry that error's internal message.
    const message =
      exception.getResponse() instanceof Error ? code : exception.message;
    return { status, body: { error: { code, message, details: null } } };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: null,
      },
    },
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = toErrorResponse(exception);
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unknown error',
        exception instanceof Error ? exception.stack : undefined,
      );
    }
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }
}
