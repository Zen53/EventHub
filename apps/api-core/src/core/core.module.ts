import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { envSchema } from './config/env.schema.js';
import { AllExceptionsFilter } from './errors/all-exceptions.filter.js';
import { SecurityModule } from './security/security.module.js';
import { createValidationPipe } from './validation/validation.pipe.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    SecurityModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class CoreModule {}
