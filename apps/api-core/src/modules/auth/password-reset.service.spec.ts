import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Mailer, MailSendOptions } from '@nestjs/mail';
import type { Env } from '../../core/config/env.schema.js';
import type { UserRow, UsersService } from '../users/index.js';
import {
  hashPasswordResetToken,
  PasswordResetService,
} from './password-reset.service.js';
import type { PasswordResetTokensRepository } from './password-reset-tokens.repository.js';

const NOW = new Date('2026-11-25T10:00:00Z');

const row: UserRow = {
  id: 'a1b2c3d4-0000-4000-8000-000000000002',
  email: 'camille@exemple.fr',
  firstName: 'Camille',
  lastName: 'Durand',
  phone: null,
  passwordHash: 'stored-hash',
  createdAt: new Date('2026-11-13T10:00:00Z'),
  updatedAt: new Date('2026-11-13T10:00:00Z'),
};

function setup() {
  const users = { findByEmail: vi.fn().mockResolvedValue(row) };
  const tokens = { replaceForUser: vi.fn().mockResolvedValue(undefined) };
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
    expect(tokens.replaceForUser).toHaveBeenCalledWith({
      userId: row.id,
      tokenHash: hashPasswordResetToken(token),
      expiresAt: new Date('2026-11-25T11:00:00Z'),
    });
    expect(hashPasswordResetToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(tokens.replaceForUser.mock.calls)).not.toContain(
      token,
    );
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
