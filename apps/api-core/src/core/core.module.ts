import { Module, StandardSchemaSerializerInterceptor } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { envSchema } from './config/env.schema.js';
import { AllExceptionsFilter } from './errors/all-exceptions.filter.js';
import { RateLimitModule } from './rate-limit/index.js';
import { SecurityModule } from './security/security.module.js';
import { createValidationPipe } from './validation/validation.pipe.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    SecurityModule,
    RateLimitModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
    {
      provide: APP_INTERCEPTOR,
      useClass: StandardSchemaSerializerInterceptor,
    },
  ],
})
export class CoreModule {}
