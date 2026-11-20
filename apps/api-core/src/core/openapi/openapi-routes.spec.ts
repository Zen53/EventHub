import type { INestApplication } from '@nestjs/common';
import type {
  OpenAPIObject,
  OperationObject,
  ResponseObject,
  SchemaObject,
} from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { createOpenApiDocument } from './openapi.js';

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({ $client: { end: vi.fn() } })),
}));

type Route = readonly ['get' | 'post', string];

const routes: readonly Route[] = [
  ['post', '/auth/register'],
  ['post', '/auth/login'],
  ['post', '/auth/refresh'],
  ['post', '/auth/logout'],
  ['get', '/me'],
];

describe('OpenAPI documentation of the auth and /me routes', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  const operation = ([method, path]: Route): OperationObject => {
    const found = document.paths[path]?.[method];
    if (!found) {
      throw new Error(`No operation for ${method.toUpperCase()} ${path}`);
    }
    return found;
  };

  const response = (route: Route, status: string): ResponseObject => {
    const found = operation(route).responses[status];
    if (!found || '$ref' in found) {
      throw new Error(`No inline response ${status} for ${route.join(' ')}`);
    }
    return found;
  };

  const jsonSchema = (route: Route, status: string): SchemaObject => {
    const schema = response(route, status).content?.['application/json']
      ?.schema;
    if (!schema || '$ref' in schema) {
      throw new Error(`No inline schema for ${status} on ${route.join(' ')}`);
    }
    return schema;
  };

  const propertiesOf = (schema: SchemaObject | undefined): string[] =>
    Object.keys(schema?.properties ?? {});

  const expectErrorResponse = (route: Route, status: string, code: string) => {
    expect(response(route, status).description).toContain(code);
    const schema = jsonSchema(route, status);
    expect(propertiesOf(schema)).toEqual(['error']);
    expect(propertiesOf(schema.properties?.error as SchemaObject)).toEqual(
      expect.arrayContaining(['code', 'message', 'details']),
    );
  };

  beforeAll(async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');
    vi.stubEnv('JWT_ACCESS_SECRET', 'test-only-access-secret-of-32-chars!');
    const { AppModule } = await import('../../app.module.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    document = createOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it.each([
    [routes[0], ['201', '400', '409']],
    [routes[1], ['200', '400', '401']],
    [routes[2], ['200', '401']],
    [routes[3], ['204']],
    [routes[4], ['200', '401']],
  ] as const)('documents the responses of %j', (route, statuses) => {
    expect(Object.keys(operation(route).responses).sort()).toEqual([
      ...statuses,
    ]);
  });

  it.each(routes)('gives %s %s a summary and a tag', (method, path) => {
    const { summary, tags } = operation([method, path]);

    expect(summary).toBeTruthy();
    expect(tags).toEqual([path === '/me' ? 'Users' : 'Auth']);
  });

  it('describes every response', () => {
    const descriptions = routes.flatMap((route) =>
      Object.keys(operation(route).responses).map(
        (status) => response(route, status).description,
      ),
    );

    expect(descriptions).not.toContain('');
    expect(descriptions.every((description) => description.trim())).toBe(true);
  });

  it('returns the created User on register', () => {
    expect(propertiesOf(jsonSchema(routes[0], '201'))).toEqual(
      expect.arrayContaining(['id', 'email', 'firstName', 'createdAt']),
    );
    expect(propertiesOf(jsonSchema(routes[0], '201'))).not.toContain(
      'passwordHash',
    );
    expectErrorResponse(routes[0], '400', 'VALIDATION_ERROR');
    expectErrorResponse(routes[0], '409', 'EMAIL_ALREADY_USED');
  });

  it('returns the access token, the User and the refresh cookie on login', () => {
    const schema = jsonSchema(routes[1], '200');

    expect(propertiesOf(schema)).toEqual(['accessToken', 'user']);
    expect(propertiesOf(schema.properties?.user as SchemaObject)).toContain(
      'email',
    );
    expect(response(routes[1], '200').headers).toHaveProperty('Set-Cookie');
    expectErrorResponse(routes[1], '400', 'VALIDATION_ERROR');
    expectErrorResponse(routes[1], '401', 'INVALID_CREDENTIALS');
  });

  it('returns a new access token and rotates the refresh cookie on refresh', () => {
    expect(propertiesOf(jsonSchema(routes[2], '200'))).toEqual(['accessToken']);
    expect(response(routes[2], '200').headers).toHaveProperty('Set-Cookie');
    expectErrorResponse(routes[2], '401', 'INVALID_REFRESH_TOKEN');
  });

  it('answers 204 without a body and clears the cookie on logout', () => {
    const noContent = response(routes[3], '204');

    expect(noContent.content).toBeUndefined();
    expect(noContent.headers).toHaveProperty('Set-Cookie');
  });

  it('returns the User on GET /me', () => {
    expect(propertiesOf(jsonSchema(routes[4], '200'))).toEqual(
      expect.arrayContaining(['id', 'email', 'phone', 'updatedAt']),
    );
    expectErrorResponse(routes[4], '401', 'UNAUTHORIZED');
  });

  it.each([
    [routes[0], undefined],
    [routes[1], undefined],
    [routes[2], [{ cookie: [] }]],
    [routes[3], [{ cookie: [] }]],
    [routes[4], [{ bearer: [] }]],
  ] as const)('declares the security of %j', (route, security) => {
    expect(operation(route).security).toEqual(security);
  });

  it('does not require the bearer token on public routes', () => {
    expect(document.security).toBeUndefined();
    const publicRoutes = routes.slice(0, 4);

    for (const route of publicRoutes) {
      expect(JSON.stringify(operation(route).security ?? [])).not.toContain(
        'bearer',
      );
    }
  });
});
