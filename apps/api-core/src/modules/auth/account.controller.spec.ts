import { deleteMeBodySchema } from '@eventhub/schemas';
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
import { AccountController } from './account.controller.js';
import type { AccountService } from './account.service.js';

const USER_ID = 'a1b2c3d4-0000-4000-8000-000000000002';
const body = { password: 'motdepasse123' };

const handler = Object.getOwnPropertyDescriptor(
  AccountController.prototype,
  'deleteMe',
)?.value as object;

function setup() {
  const account = { deleteAccount: vi.fn().mockResolvedValue(undefined) };
  const controller = new AccountController(
    account as unknown as AccountService,
  );
  const response = { cookie: vi.fn(), clearCookie: vi.fn() };
  const call = () =>
    controller.deleteMe(
      { userId: USER_ID },
      body,
      response as unknown as Response,
    );
  return { account, response, call };
}

describe('AccountController routing', () => {
  it('is mounted on DELETE /me and answers 204 with a passthrough response', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AccountController)).toBe('me');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.DELETE,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(
      HttpStatus.NO_CONTENT,
    );
    expect(
      Reflect.getMetadata(
        RESPONSE_PASSTHROUGH_METADATA,
        AccountController,
        'deleteMe',
      ),
    ).toBe(true);
  });

  it('is protected by the access token', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AccountController),
    ).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('validates the body with deleteMeBodySchema', () => {
    const args = Object.values(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        AccountController,
        'deleteMe',
      ) as Record<string, { index: number; schema?: unknown }>,
    );

    expect(args.find((arg) => arg.index === 1)?.schema).toBe(
      deleteMeBodySchema,
    );
  });
});

describe('AccountController.deleteMe', () => {
  it('deletes the account of the identified user, clears the refresh cookie and returns no body', async () => {
    const { account, response, call } = setup();

    await expect(call()).resolves.toBeUndefined();

    expect(account.deleteAccount).toHaveBeenCalledWith(USER_ID, body);
    expect(response.clearCookie).toHaveBeenCalledWith('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
    });
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it.each(['WRONG_PASSWORD', 'ACCOUNT_HAS_UPCOMING_EVENTS'] as const)(
    'propagates %s and keeps the cookie',
    async (code) => {
      const { account, response, call } = setup();
      const error = new AppError(code);
      account.deleteAccount.mockRejectedValue(error);

      await expect(call()).rejects.toBe(error);
      expect(response.clearCookie).not.toHaveBeenCalled();
    },
  );
});

describe('validation of the DELETE /me body by the global pipe', () => {
  const validate = (value: unknown) =>
    createValidationPipe().transform(value, {
      type: 'body',
      schema: deleteMeBodySchema,
    });

  it('returns the parsed body', async () => {
    await expect(validate(body)).resolves.toEqual(body);
  });

  it.each([
    [{}, 'password'],
    [{ password: '' }, 'password'],
    [{ ...body, email: 'camille@exemple.fr' }, 'email'],
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
