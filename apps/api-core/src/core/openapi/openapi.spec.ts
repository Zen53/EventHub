import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OpenAPIObject, SchemaObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { createOpenApiDocument, setupOpenApi } from './openapi.js';

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({ $client: { end: vi.fn() } })),
}));

const requestBodySchema = (
  document: OpenAPIObject,
  path: string,
): SchemaObject => {
  const body = document.paths[path]?.post?.requestBody;
  if (!body || !('content' in body)) {
    throw new Error(`No request body for POST ${path}`);
  }
  const schema = body.content['application/json']?.schema;
  if (!schema || '$ref' in schema) {
    throw new Error(`No inline schema for POST ${path}`);
  }
  return schema;
};

describe('OpenAPI document of the application', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');
    vi.stubEnv('JWT_ACCESS_SECRET', 'test-only-access-secret-of-32-chars!');
    vi.stubEnv('SMTP_URL', 'smtp://localhost:1025');
    vi.stubEnv('MAIL_FROM', 'EventHub <no-reply@eventhub.test>');
    vi.stubEnv('WEB_URL', 'http://localhost:3000');
    const { AppModule } = await import('../../app.module.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    document = createOpenApiDocument(app);
    setupOpenApi(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('serves /docs and /docs-json without an access token', async () => {
    await request(app.getHttpServer())
      .get('/docs')
      .expect(200)
      .expect('Content-Type', /html/);
    const { body } = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    expect(body).toMatchObject({ info: { title: 'EventHub API' } });
  });

  it('describes the API', () => {
    expect(document.info).toMatchObject({
      title: 'EventHub API',
      version: '0.0.1',
    });
  });

  it('declares the bearer access token and the refreshToken cookie', () => {
    expect(document.components?.securitySchemes).toEqual({
      bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      cookie: { type: 'apiKey', in: 'cookie', name: 'refreshToken' },
    });
  });

  it('scans the controllers and converts their Zod body schemas', () => {
    const schema = requestBodySchema(document, '/auth/login');

    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties ?? {})).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
    expect(schema.required).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });
});

describe('setupOpenApi', () => {
  const createApp = async (
    nodeEnv: 'development' | 'production' | 'test',
  ): Promise<INestApplication> => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({ NODE_ENV: nodeEnv }),
        },
      ],
    }).compile();
    return moduleRef.createNestApplication();
  };

  it.each(['development', 'test'] as const)(
    'serves Swagger UI on /docs and the JSON on /docs-json when NODE_ENV=%s',
    async (nodeEnv) => {
      const app = await createApp(nodeEnv);

      setupOpenApi(app);
      await app.init();

      await request(app.getHttpServer())
        .get('/docs')
        .expect(200)
        .expect('Content-Type', /html/);
      const { body } = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200);
      expect(body).toMatchObject({ info: { title: 'EventHub API' } });

      await app.close();
    },
  );

  it('serves nothing when NODE_ENV=production', async () => {
    const app = await createApp('production');

    setupOpenApi(app);
    await app.init();

    await request(app.getHttpServer()).get('/docs').expect(404);
    await request(app.getHttpServer()).get('/docs-json').expect(404);

    await app.close();
  });
});
