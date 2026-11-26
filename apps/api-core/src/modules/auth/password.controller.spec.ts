import { changePasswordBodySchema } from '@eventhub/schemas';
import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  RESPONSE_PASSTHROUGH_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants.js';
import type { Response } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { IS_PUBLIC_KEY } from '../../core/security/public.decorator.js';
import { createValidationPipe } from '../../core/validation/validation.pipe.js';
import type { AuthService } from './auth.service.js';
import { PasswordController } from './password.controller.js';

const USER_ID = 'a1b2c3d4-0000-4000-8000-000000000002';

const body = {
  currentPassword: 'motdepasse123',
  newPassword: 'nouveaumotdepasse456',
};

const issued = {
  token: 'new-session-refresh-token',
  jti: 'e1b2c3d4-0000-4000-8000-000000000005',
  expiresAt: new Date('2026-12-02T10:00:00Z'),
};

const handler = Object.getOwnPropertyDescriptor(
  PasswordController.prototype,
  'changePassword',
)?.value as object;

function setup() {
  const auth = { changePassword: vi.fn().mockResolvedValue(issued) };
  const controller = new PasswordController(auth as unknown as AuthService);
  const response = { cookie: vi.fn(), clearCookie: vi.fn() };
  const call = () =>
    controller.changePassword(
      { userId: USER_ID },
      body,
      response as unknown as Response,
    );
  return { auth, response, call };
}

describe('PasswordController routing', () => {
  it('is mounted on PATCH /me/password and answers 204 with a passthrough response', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PasswordController)).toBe('me');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('password');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.PATCH,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(
      HttpStatus.NO_CONTENT,
    );
    expect(
      Reflect.getMetadata(
        RESPONSE_PASSTHROUGH_METADATA,
        PasswordController,
        'changePassword',
      ),
    ).toBe(true);
  });

  it('is protected by the access token, neither on the class nor on the handler public', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, PasswordController),
    ).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('validates the body with changePasswordBodySchema', () => {
    const args = Object.values(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        PasswordController,
        'changePassword',
      ) as Record<string, { index: number; schema?: unknown }>,
    );

    expect(args.find((arg) => arg.index === 1)?.schema).toBe(
      changePasswordBodySchema,
    );
  });
});

describe('PasswordController.changePassword', () => {
  it('changes the password of the identified user and sets the new refresh token cookie for the current session', async () => {
    const { auth, response, call } = setup();

    await expect(call()).resolves.toBeUndefined();

    expect(auth.changePassword).toHaveBeenCalledWith(USER_ID, body);
    expect(response.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'new-session-refresh-token',
      {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );
    expect(response.clearCookie).not.toHaveBeenCalled();
  });

  it('propagates 403 WRONG_PASSWORD without touching the cookie', async () => {
    const { auth, response, call } = setup();
    const error = new AppError('WRONG_PASSWORD');
    auth.changePassword.mockRejectedValue(error);

    await expect(call()).rejects.toBe(error);
    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.clearCookie).not.toHaveBeenCalled();
  });
});

describe('validation of the change password body by the global pipe', () => {
  const validate = (value: unknown) =>
    createValidationPipe().transform(value, {
      type: 'body',
      schema: changePasswordBodySchema,
    });

  it('returns the parsed body', async () => {
    await expect(validate(body)).resolves.toEqual(body);
  });

  it.each([
    [{ currentPassword: 'motdepasse123' }, 'newPassword'],
    [{ newPassword: 'nouveaumotdepasse456' }, 'currentPassword'],
    [{ ...body, newPassword: 'court1' }, 'newPassword'],
    [{ ...body, confirmPassword: 'nouveaumotdepasse456' }, 'confirmPassword'],
  ])('throws 400 VALIDATION_ERROR for %j on %s', async (value, field) => {
    const promise = validate(value);

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: expect.arrayContaining([expect.objectContaining({ field })]),
    });
  });
});
