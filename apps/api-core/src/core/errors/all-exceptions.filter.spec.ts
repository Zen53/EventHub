import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  MethodNotAllowedException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { errorResponseSchema } from '@eventhub/schemas';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { AppError } from './app-error.js';

function catchWith(exception: unknown) {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  errorResponseSchema.parse(response.json.mock.calls[0][0]);
  return {
    status: response.status.mock.calls[0][0],
    body: response.json.mock.calls[0][0],
  };
}

describe('AllExceptionsFilter', () => {
  it('renders an AppError with the status and message of its code and its details', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];

    expect(catchWith(new AppError('VALIDATION_ERROR', details))).toEqual({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        },
      },
    });
  });

  it('renders null details when an AppError has none', () => {
    expect(catchWith(new AppError('EMAIL_ALREADY_USED'))).toEqual({
      status: 409,
      body: {
        error: {
          code: 'EMAIL_ALREADY_USED',
          message: 'Email already used',
          details: null,
        },
      },
    });
  });

  it('maps a Nest 404 to NOT_FOUND', () => {
    expect(catchWith(new NotFoundException('Cannot GET /nope'))).toEqual({
      status: 404,
      body: {
        error: {
          code: 'NOT_FOUND',
          message: 'Cannot GET /nope',
          details: null,
        },
      },
    });
  });

  it('maps a Nest 401 to UNAUTHORIZED', () => {
    const { status, body } = catchWith(new UnauthorizedException());

    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('maps a Nest 403 to FORBIDDEN', () => {
    const { status, body } = catchWith(new ForbiddenException());

    expect(status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it.each([
    ['a 405', new MethodNotAllowedException()],
    ['a 418', new HttpException('teapot', 418)],
    ['a 3xx', new HttpException('moved', 302)],
  ])('renders %s HttpException as a 400 BAD_REQUEST', (_, exception) => {
    expect(catchWith(exception)).toEqual({
      status: 400,
      body: {
        error: { code: 'BAD_REQUEST', message: 'Bad request', details: null },
      },
    });
  });

  it('does not expose the message of an Error wrapped in an HttpException', () => {
    const { status, body } = catchWith(
      new BadRequestException(new Error('column "pwd" missing')),
    );

    expect(status).toBe(400);
    expect(body.error).toEqual({
      code: 'BAD_REQUEST',
      message: 'BAD_REQUEST',
      details: null,
    });
  });

  it('hides a 5xx HttpException behind a 500 INTERNAL_ERROR', () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    expect(
      catchWith(new ServiceUnavailableException('redis down at 10.0.0.3')),
    ).toEqual({
      status: 500,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          details: null,
        },
      },
    });
  });

  it('hides a thrown non-Error value behind a 500 INTERNAL_ERROR', () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    expect(catchWith('boom')).toEqual({
      status: 500,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          details: null,
        },
      },
    });
  });

  it('returns a fresh body for each 500', () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    expect(catchWith(new Error('a')).body).not.toBe(
      catchWith(new Error('b')).body,
    );
  });

  it('hides an unexpected error behind a 500 INTERNAL_ERROR without its stack', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { status, body } = catchWith(new Error('db password is hunter2'));

    expect(status).toBe(500);
    expect(body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: null,
      },
    });
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });
});
