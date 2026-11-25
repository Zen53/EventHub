import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Mailer, MailSendOptions } from '@nestjs/mail';
import type { Env } from '../../core/config/env.schema.js';
import type { Transaction } from '../../core/database/index.js';
import { AppError } from '../../core/errors/app-error.js';
import type { UserRow, UsersService } from '../users/index.js';
import {
  hashPasswordResetToken,
  PasswordResetService,
} from './password-reset.service.js';
import type {
  ChangePassword,
  PasswordResetTokensRepository,
} from './password-reset-tokens.repository.js';

const NOW = new Date('2026-11-25T10:00:00Z');
const transaction = {} as Transaction;

const row: UserRow = {
  id: 'a1b2c3d4-0000-4000-8000-000000000002',
  email: 'camille@exemple.fr',
  firstName: 'Camille',
  lastName: 'Durand',
  phone: null,
  passwordHash: 'stored-hash',
  tokensRevokedAt: null,
  createdAt: new Date('2026-11-13T10:00:00Z'),
  updatedAt: new Date('2026-11-13T10:00:00Z'),
};

function setup() {
  const users = {
    findByEmail: vi.fn().mockResolvedValue(row),
    hashPassword: vi.fn().mockResolvedValue('new-hash'),
    setPassword: vi.fn().mockResolvedValue(true),
  };
  const tokens = {
    replaceForUser: vi.fn().mockResolvedValue(true),
    isUsable: vi.fn().mockResolvedValue(true),
    consume: vi.fn((_tokenHash: string, changePassword: ChangePassword) =>
      changePassword(row.id, transaction),
    ),
  };
  const mailer = { send: vi.fn().mockResolvedValue({ attempts: 1 }) };
  const config = { get: vi.fn().mockReturnValue('https://eventhub.test') };
  const service = new PasswordResetService(
    users as unknown as UsersService,
    tokens as unknown as PasswordResetTokensRepository,
    mailer as unknown as Mailer,
    config as unknown as ConfigService<Env, true>,
  );
  const sentMail = () => mailer.send.mock.calls[0][0] as MailSendOptions;
  const sentToken = () => {
    const link = /https:\/\/eventhub\.test\S+/.exec(sentMail().text ?? '');
    return new URL(link?.[0] ?? '').searchParams.get('token') ?? '';
  };
  return { service, users, tokens, mailer, config, sentMail, sentToken };
}

describe('PasswordResetService.request', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does nothing when no account has this email', async () => {
    const { service, users, tokens, mailer } = setup();
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.request('inconnu@exemple.fr'),
    ).resolves.toBeUndefined();
    expect(users.findByEmail).toHaveBeenCalledWith('inconnu@exemple.fr');
    expect(tokens.replaceForUser).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('emails the user a link to the reset page of the front', async () => {
    const { service, sentMail, config } = setup();

    await service.request(row.email);

    const mail = sentMail();
    expect(config.get).toHaveBeenCalledWith('WEB_URL', { infer: true });
    expect(mail.to).toBe('camille@exemple.fr');
    expect(mail.subject).toContain('mot de passe');
    expect(mail.text).toContain('Bonjour Camille,');
    expect(mail.text).toContain('valable 1 heure');
    expect(mail.text).toMatch(
      /https:\/\/eventhub\.test\/reset-password\?token=[\w-]+/,
    );
    expect(String(mail.html)).toMatch(
      /href="https:\/\/eventhub\.test\/reset-password\?token=[\w-]+"/,
    );
  });

  it('generates a random token of 32 bytes, different on each request', async () => {
    const first = setup();
    const second = setup();

    await first.service.request(row.email);
    await second.service.request(row.email);

    expect(Buffer.from(first.sentToken(), 'base64url')).toHaveLength(32);
    expect(first.sentToken()).not.toBe(second.sentToken());
  });

  it('stores only the SHA-256 hash of the token, valid for one hour, replacing the previous tokens', async () => {
    const { service, tokens, sentToken } = setup();

    await service.request(row.email);

    const token = sentToken();
    expect(tokens.replaceForUser).toHaveBeenCalledTimes(1);
    expect(tokens.replaceForUser).toHaveBeenCalledWith(
      {
        userId: row.id,
        tokenHash: hashPasswordResetToken(token),
        expiresAt: new Date('2026-11-25T11:00:00Z'),
      },
      60 * 1000,
    );
    expect(hashPasswordResetToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(tokens.replaceForUser.mock.calls)).not.toContain(
      token,
    );
  });

  it('answers the same way without sending a second email to the account within 60 seconds', async () => {
    const { service, tokens, mailer } = setup();
    tokens.replaceForUser.mockResolvedValue(false);

    await expect(service.request(row.email)).resolves.toBeUndefined();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('escapes the first name in the HTML body', async () => {
    const { service, users, sentMail } = setup();
    users.findByEmail.mockResolvedValue({ ...row, firstName: '<b>Cam</b>' });

    await service.request(row.email);

    expect(String(sentMail().html)).toContain('&lt;b&gt;Cam&lt;/b&gt;');
    expect(String(sentMail().html)).not.toContain('<b>Cam</b>');
  });

  it('does not wait for the email to be delivered', async () => {
    const { service, mailer } = setup();
    mailer.send.mockReturnValue(new Promise(() => {}));

    await expect(service.request(row.email)).resolves.toBeUndefined();
    expect(mailer.send).toHaveBeenCalledTimes(1);
  });

  it('answers the same way and logs, without the email nor the token, when the email cannot be sent', async () => {
    const { service, mailer, sentToken } = setup();
    const logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const failure = new Error(`1 recipient(s) refused: ${row.email}`);
    failure.name = 'MailRecipientsRejectedError';
    mailer.send.mockRejectedValue(failure);

    await expect(service.request(row.email)).resolves.toBeUndefined();
    await vi.waitFor(() => expect(logged).toHaveBeenCalledTimes(1));

    const output = JSON.stringify(logged.mock.calls);
    expect(output).toContain(row.id);
    expect(output).toContain('MailRecipientsRejectedError');
    expect(output).not.toContain(row.email);
    expect(output).not.toContain(sentToken());
  });

  it('sends no email when the token cannot be stored', async () => {
    const { service, tokens, mailer } = setup();
    const error = new Error('connection lost');
    tokens.replaceForUser.mockRejectedValue(error);

    await expect(service.request(row.email)).rejects.toBe(error);
    expect(mailer.send).not.toHaveBeenCalled();
  });
});

describe('PasswordResetService.reset', () => {
  const resetError = (service: PasswordResetService) =>
    service
      .reset('reset-token', 'nouveaumotdepasse456')
      .catch((error: unknown) => error);

  const expectInvalidResetToken = (error: unknown) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 400, code: 'INVALID_RESET_TOKEN' });
  };

  it('hashes the new password, then consumes the hashed token and changes the password in the transaction of the token', async () => {
    const { service, users, tokens } = setup();

    await expect(
      service.reset('reset-token', 'nouveaumotdepasse456'),
    ).resolves.toBeUndefined();

    expect(users.hashPassword).toHaveBeenCalledWith('nouveaumotdepasse456');
    expect(tokens.consume).toHaveBeenCalledWith(
      hashPasswordResetToken('reset-token'),
      expect.any(Function),
    );
    expect(users.setPassword).toHaveBeenCalledWith(
      row.id,
      'new-hash',
      transaction,
    );
    expect(users.hashPassword.mock.invocationCallOrder[0]).toBeLessThan(
      tokens.consume.mock.invocationCallOrder[0],
    );
  });

  it('throws 400 INVALID_RESET_TOKEN for an unusable token without hashing any password', async () => {
    const { service, users, tokens } = setup();
    tokens.isUsable.mockResolvedValue(false);

    expectInvalidResetToken(await resetError(service));
    expect(tokens.isUsable).toHaveBeenCalledWith(
      hashPasswordResetToken('reset-token'),
    );
    expect(users.hashPassword).not.toHaveBeenCalled();
    expect(tokens.consume).not.toHaveBeenCalled();
  });

  it('leaves the token unconsumed when the new password cannot be hashed', async () => {
    const { service, users, tokens } = setup();
    const error = new Error('pool exhausted');
    users.hashPassword.mockRejectedValue(error);

    await expect(resetError(service)).resolves.toBe(error);
    expect(tokens.consume).not.toHaveBeenCalled();
    expect(users.setPassword).not.toHaveBeenCalled();
  });

  it('throws 400 INVALID_RESET_TOKEN for a token used by another request in the meantime, without changing any password', async () => {
    const { service, users, tokens } = setup();
    tokens.consume.mockResolvedValue(false);

    expectInvalidResetToken(await resetError(service));
    expect(users.setPassword).not.toHaveBeenCalled();
  });

  it('throws 400 INVALID_RESET_TOKEN when the user no longer exists', async () => {
    const { service, users } = setup();
    users.setPassword.mockResolvedValue(false);

    expectInvalidResetToken(await resetError(service));
  });

  it('propagates a database error raised while changing the password', async () => {
    const { service, users } = setup();
    const error = new Error('connection lost');
    users.setPassword.mockRejectedValue(error);

    await expect(resetError(service)).resolves.toBe(error);
  });
});
