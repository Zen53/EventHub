import { ArgumentsHost, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { AppError } from './app-error.js';

function catchWith(exception: unknown) {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: response.status.mock.calls[0][0], body: response.json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  it('renders an AppError with its status, code, message and details', () => {
    const details = [{ field: 'email', message: 'taken' }];

    expect(catchWith(new AppError(409, 'EMAIL_TAKEN', 'Email already used', details))).toEqual({
      status: 409,
      body: { error: { code: 'EMAIL_TAKEN', message: 'Email already used', details } },
    });
  });

  it('renders null details when an AppError has none', () => {
    expect(catchWith(new AppError(403, 'FORBIDDEN', 'No')).body.error.details).toBeNull();
  });

  it('maps a Nest 404 to NOT_FOUND', () => {
    expect(catchWith(new NotFoundException('Cannot GET /nope'))).toEqual({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'Cannot GET /nope', details: null } },
    });
  });

  it('maps a Nest 401 to UNAUTHORIZED', () => {
    const { status, body } = catchWith(new UnauthorizedException());

    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('hides an unexpected error behind a 500 INTERNAL_ERROR without its stack', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { status, body } = catchWith(new Error('db password is hunter2'));

    expect(status).toBe(500);
    expect(body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: null },
    });
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });
});
