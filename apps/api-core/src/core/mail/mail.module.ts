import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailModule as NestMailModule, SmtpTransport } from '@nestjs/mail';
import type { Env } from '../config/env.schema.js';

@Module({
  imports: [
    NestMailModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        transport: new SmtpTransport({
          url: config.get('SMTP_URL', { infer: true }),
        }),
        from: config.get('MAIL_FROM', { infer: true }),
      }),
    }),
  ],
})
export class MailModule {}
