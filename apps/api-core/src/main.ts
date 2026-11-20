import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import type { Env } from './core/config/env.schema.js';
import { setupOpenApi } from './core/openapi/openapi.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  // Closes the database connection on SIGTERM/SIGINT.
  app.enableShutdownHooks();
  setupOpenApi(app);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
