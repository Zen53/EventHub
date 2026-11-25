import { Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Mailer, MailTransport, SmtpTransport } from '@nestjs/mail';
import { Test } from '@nestjs/testing';
import { envSchema } from '../config/env.schema.js';
import { MailModule } from './mail.module.js';

const configModule = () =>
  ConfigModule.forRoot({
    isGlobal: true,
    ignoreEnvFile: true,
    validationSchema: envSchema,
  });

@Injectable()
class Consumer {
  constructor(readonly mailer: Mailer) {}
}

describe('MailModule', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');
    vi.stubEnv('JWT_ACCESS_SECRET', 'test-only-access-secret-of-32-chars!');
    vi.stubEnv('SMTP_URL', 'smtp://localhost:1025');
    vi.stubEnv('MAIL_FROM', 'EventHub <no-reply@eventhub.test>');
    vi.stubEnv('WEB_URL', 'http://localhost:3000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('gives feature modules a Mailer that sends over SMTP from MAIL_FROM', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [configModule(), MailModule],
      providers: [Consumer],
    }).compile();

    expect(moduleRef.get(MailTransport, { strict: false })).toBeInstanceOf(
      SmtpTransport,
    );
    const message = await moduleRef.get(Consumer).mailer.render({
      to: 'camille.durand@exemple.fr',
      subject: 'Bienvenue',
      text: 'Bonjour',
    });
    expect(message.from).toEqual({
      name: 'EventHub',
      address: 'no-reply@eventhub.test',
    });

    await moduleRef.close();
  });

  it('fails to start when SMTP_URL is missing', async () => {
    vi.stubEnv('SMTP_URL', undefined);

    await expect(
      Test.createTestingModule({
        imports: [configModule(), MailModule],
      }).compile(),
    ).rejects.toThrow(/SMTP_URL/);
  });
});
