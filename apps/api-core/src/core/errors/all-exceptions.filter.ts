import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from './app-error.js';

export interface ErrorBody {
  error: { code: string; message: string; details: unknown };
}

const INTERNAL_ERROR = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  body: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: null } },
};

export function toErrorResponse(exception: unknown): { status: number; body: ErrorBody } {
  if (exception instanceof AppError) {
    const { status, code, message, details } = exception;
    return { status, body: { error: { code, message, details: details ?? null } } };
  }
  if (exception instanceof HttpException && exception.getStatus() < 500) {
    const status = exception.getStatus();
    const code = (HttpStatus[status] as string | undefined) ?? 'HTTP_ERROR';
    return { status, body: { error: { code, message: exception.message, details: null } } };
  }
  return INTERNAL_ERROR;
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
