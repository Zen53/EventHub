import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  errorCatalog,
  type ErrorCode,
  type ErrorResponse,
} from '@eventhub/schemas';
import type { Response } from 'express';
import { AppError } from './app-error.js';

const httpExceptionCodes: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
};

function fromCatalog(
  code: ErrorCode,
  message: string = errorCatalog[code].message,
): { status: number; body: ErrorResponse } {
  return {
    status: errorCatalog[code].status,
    body: { error: { code, message, details: null } },
  };
}

function fromHttpException(exception: HttpException) {
  const code = httpExceptionCodes[exception.getStatus()];
  if (!code) return fromCatalog('BAD_REQUEST');
  const message =
    exception.getResponse() instanceof Error ? code : exception.message;
  return fromCatalog(code, message);
}

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
    return fromHttpException(exception);
  }
  return fromCatalog('INTERNAL_ERROR');
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
