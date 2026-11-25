import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import type { Env } from './core/config/env.schema.js';
import { setupOpenApi } from './core/openapi/openapi.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.set('trust proxy', config.get('TRUSTED_PROXY_HOPS', { infer: true }));
  app.use(cookieParser());
  // Closes the database connection on SIGTERM/SIGINT.
  app.enableShutdownHooks();
  setupOpenApi(app);
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
