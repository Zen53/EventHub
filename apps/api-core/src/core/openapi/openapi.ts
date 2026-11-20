import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import type { Env } from '../config/env.schema.js';

const buildOpenApiConfig = (): Omit<OpenAPIObject, 'paths'> =>
  new DocumentBuilder()
    .setTitle('EventHub API')
    .setDescription('API de la plateforme de gestion d’événements EventHub.')
    .setVersion('0.0.1')
    .addBearerAuth()
    .addCookieAuth('refreshToken')
    .build();

export const createOpenApiDocument = (app: INestApplication): OpenAPIObject =>
  SwaggerModule.createDocument(app, buildOpenApiConfig());

export const setupOpenApi = (app: INestApplication): void => {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  if (config.get('NODE_ENV', { infer: true }) === 'production') {
    return;
  }
  SwaggerModule.setup('docs', app, () => createOpenApiDocument(app));
};
