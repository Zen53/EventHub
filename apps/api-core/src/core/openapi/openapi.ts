import {
  errorCatalog,
  type ErrorCode,
  errorResponseSchema,
} from '@eventhub/schemas';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModulesContainer, Reflector } from '@nestjs/core';
import {
  DocumentBuilder,
  type OpenAPIObject,
  type OperationObject,
  type SchemaObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { STATUS_CODES } from 'node:http';
import { z } from 'zod';
import type { Env } from '../config/env.schema.js';
import { IS_PUBLIC_KEY } from '../security/public.decorator.js';
import { ERROR_CODES_EXTENSION } from './api-endpoint.js';

const ERROR_RESPONSE_COMPONENT = 'ErrorResponse';

type DocumentedOperation = OperationObject & {
  [ERROR_CODES_EXTENSION]?: ErrorCode[];
};

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
] as const;

const buildOpenApiConfig = (): Omit<OpenAPIObject, 'paths'> =>
  new DocumentBuilder()
    .setTitle('EventHub API')
    .setDescription('API de la plateforme de gestion d’événements EventHub.')
    .setVersion('0.0.1')
    .addBearerAuth()
    .addCookieAuth('refreshToken')
    .addSecurityRequirements('bearer')
    .build();

const publicOperationIds = (app: INestApplication): Map<string, boolean> => {
  const reflector = app.get(Reflector);
  const controllers = [...app.get(ModulesContainer).values()].flatMap(
    (module) => [...module.controllers.values()],
  );
  const entries = controllers.flatMap(({ metatype }) => {
    if (!metatype) {
      return [];
    }
    const prototype = metatype.prototype as Record<string, unknown>;
    return Object.getOwnPropertyNames(prototype)
      .filter(
        (key) => key !== 'constructor' && typeof prototype[key] === 'function',
      )
      .map((key): [string, boolean] => [
        `${metatype.name}_${key}`,
        reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
          prototype[key] as () => unknown,
          metatype,
        ]) === true,
      ]);
  });
  return new Map(entries);
};

const describeError = (code: ErrorCode): string =>
  `\`${code}\` : ${errorCatalog[code].message}`;

const errorExample = (code: ErrorCode) => ({
  summary: code,
  value: {
    error: {
      code,
      message: errorCatalog[code].message,
      details:
        code === 'VALIDATION_ERROR'
          ? [{ field: 'email', message: "L'email n'est pas valide." }]
          : null,
    },
  },
});

const addError = (operation: OperationObject, code: ErrorCode): void => {
  const status = String(errorCatalog[code].status);
  const existing = operation.responses[status];
  if (!existing) {
    operation.responses[status] = {
      description: describeError(code),
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${ERROR_RESPONSE_COMPONENT}` },
          examples: { [code]: errorExample(code) },
        },
      },
    };
    return;
  }
  if (!('description' in existing) || existing.description.includes(code)) {
    return;
  }
  existing.description = `${existing.description}\n\n${describeError(code)}`;
  const media = existing.content?.['application/json'];
  if (media) {
    media.examples = { ...media.examples, [code]: errorExample(code) };
  }
};

const describeEmptyResponses = (operation: OperationObject): void => {
  for (const [status, response] of Object.entries(operation.responses)) {
    if (response && 'description' in response && !response.description) {
      response.description = STATUS_CODES[Number(status)] ?? status;
    }
  }
};

const completeOperation = (
  operation: DocumentedOperation,
  isPublic: boolean | undefined,
): void => {
  const declared = operation[ERROR_CODES_EXTENSION] ?? [];
  delete operation[ERROR_CODES_EXTENSION];
  for (const code of declared) {
    addError(operation, code);
  }
  if (isPublic) {
    operation.security ??= [];
  } else if (isPublic === false) {
    addError(operation, 'UNAUTHORIZED');
  }
  if (operation.requestBody) {
    addError(operation, 'VALIDATION_ERROR');
  }
  describeEmptyResponses(operation);
};

export const createOpenApiDocument = (app: INestApplication): OpenAPIObject => {
  const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
  const publicByOperationId = publicOperationIds(app);
  for (const pathItem of Object.values(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) {
        completeOperation(
          operation,
          publicByOperationId.get(operation.operationId ?? ''),
        );
      }
    }
  }
  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      [ERROR_RESPONSE_COMPONENT]: z.toJSONSchema(errorResponseSchema, {
        target: 'openapi-3.0',
        io: 'output',
      }) as SchemaObject,
    },
  };
  return document;
};

export const setupOpenApi = (app: INestApplication): void => {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  if (config.get('NODE_ENV', { infer: true }) === 'production') {
    return;
  }
  SwaggerModule.setup('docs', app, () => createOpenApiDocument(app));
};
