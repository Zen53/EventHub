import {
  ArgumentsHost,
  BadRequestException,
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
  // Every body must match the error format shared with the front.
  errorResponseSchema.parse(response.json.mock.calls[0][0]);
  return {
    status: response.status.mock.calls[0][0],
    body: response.json.mock.calls[0][0],
  };
}

describe('AllExceptionsFilter', () => {
  it('renders an AppError with its status, code, message and details', () => {
    const details = [{ field: 'email', message: 'taken' }];

    expect(
      catchWith(
        new AppError(409, 'EMAIL_TAKEN', 'Email already used', details),
      ),
    ).toEqual({
      status: 409,
      body: {
        error: { code: 'EMAIL_TAKEN', message: 'Email already used', details },
      },
    });
  });

  it('renders null details when an AppError has none', () => {
    expect(
      catchWith(new AppError(403, 'FORBIDDEN', 'No')).body.error.details,
    ).toBeNull();
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
