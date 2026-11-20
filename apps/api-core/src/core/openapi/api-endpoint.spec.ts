import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  type INestApplication,
  Logger,
  Post,
} from '@nestjs/common';
import type {
  OpenAPIObject,
  OperationObject,
  ResponseObject,
  SchemaObject,
} from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { z } from 'zod';
import { CoreModule } from '../core.module.js';
import { Public } from '../security/index.js';
import { ApiEndpoint } from './api-endpoint.js';
import { createOpenApiDocument } from './openapi.js';

const itemSchema = z.object({ id: z.string(), name: z.string() });

@Controller('items')
class ItemsController {
  @Public()
  @ApiEndpoint('Créer', {
    response: itemSchema,
    errors: ['INVALID_CREDENTIALS', 'INVALID_REFRESH_TOKEN'],
  })
  @Post()
  create(): object {
    return { id: '1', name: 'a', secret: 'hidden' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('search')
  @ApiEndpoint('Chercher', { response: itemSchema })
  search(): object {
    return { id: 1 };
  }

  @Get()
  list(): object[] {
    return [];
  }
}

describe('ApiEndpoint', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  const operation = (path: string, method: 'get' | 'post'): OperationObject => {
    const found = document.paths[path]?.[method];
    if (!found) {
      throw new Error(`No operation for ${method} ${path}`);
    }
    return found;
  };

  const response = (
    path: string,
    method: 'get' | 'post',
    status: string,
  ): ResponseObject =>
    operation(path, method).responses[status] as ResponseObject;

  beforeAll(async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');
    vi.stubEnv('JWT_ACCESS_SECRET', 'test-only-access-secret-of-32-chars!');
    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule],
      controllers: [ItemsController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    document = createOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('documents the response schema under the status Nest answers with', () => {
    const created = response('/items', 'post', '201');
    const ok = response('/items/search', 'post', '200');

    expect(
      Object.keys(
        (
          created.content?.['application/json']?.schema as
            SchemaObject | undefined
        )?.properties ?? {},
      ),
    ).toEqual(['id', 'name']);
    expect(ok.content?.['application/json']?.schema).toBeDefined();
    expect(operation('/items/search', 'post').responses).not.toHaveProperty(
      '201',
    );
  });

  it('groups the errors that share a status in one response', () => {
    const { description } = response('/items', 'post', '401');

    expect(description).toContain('INVALID_CREDENTIALS');
    expect(description).toContain('INVALID_REFRESH_TOKEN');
  });

  it('documents a protected route without ApiEndpoint', () => {
    expect(response('/items', 'get', '200').description).toBe('OK');
    expect(response('/items', 'get', '401').description).toContain(
      'UNAUTHORIZED',
    );
    expect(operation('/items', 'get').security).toBeUndefined();
  });

  it('strips the fields the response schema does not declare', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/items')
      .expect(201);

    expect(body).toEqual({ id: '1', name: 'a' });
  });

  it('answers 500 INTERNAL_ERROR when the response breaks its schema', async () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const { body } = await request(app.getHttpServer())
      .post('/items/search')
      .expect(500);

    expect(body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: null,
      },
    });
    expect(logError).toHaveBeenCalledOnce();
    logError.mockRestore();
  });
});
