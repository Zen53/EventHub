import type { INestApplication } from '@nestjs/common';
import type {
  OpenAPIObject,
  OperationObject,
  ReferenceObject,
  ResponseObject,
  SchemaObject,
} from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { createOpenApiDocument } from './openapi.js';

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({ $client: { end: vi.fn() } })),
}));

type Route = readonly ['get' | 'post' | 'patch', string];

const routes: readonly Route[] = [
  ['post', '/auth/register'],
  ['post', '/auth/login'],
  ['post', '/auth/refresh'],
  ['post', '/auth/logout'],
  ['get', '/me'],
  ['patch', '/me'],
  ['post', '/auth/forgot-password'],
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

  const resolve = (
    schema: SchemaObject | ReferenceObject | undefined,
  ): SchemaObject | undefined => {
    if (!schema || !('$ref' in schema)) {
      return schema;
    }
    const name = schema.$ref.replace('#/components/schemas/', '');
    return resolve(document.components?.schemas?.[name]);
  };

  const jsonSchema = (route: Route, status: string): SchemaObject => {
    const schema = resolve(
      response(route, status).content?.['application/json']?.schema,
    );
    if (!schema) {
      throw new Error(`No schema for ${status} on ${route.join(' ')}`);
    }
    return schema;
  };

  const propertiesOf = (schema: SchemaObject | undefined): string[] =>
    Object.keys(schema?.properties ?? {});

  const expectErrorResponse = (route: Route, status: string, code: string) => {
    expect(response(route, status).description).toContain(code);
    const schema = jsonSchema(route, status);
    expect(propertiesOf(schema)).toEqual(['error']);
    const error = schema.properties?.error as SchemaObject;
    expect(propertiesOf(error)).toEqual(
      expect.arrayContaining(['code', 'message', 'details']),
    );
    expect(
      (error.properties?.code as SchemaObject | undefined)?.enum,
    ).toContain(code);
  };

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
    [routes[5], ['200', '400', '401', '403', '409']],
    [routes[6], ['204', '400']],
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

  it('answers 204 without a body on forgot-password, whatever the email', () => {
    expect(response(routes[6], '204').content).toBeUndefined();
    expectErrorResponse(routes[6], '400', 'VALIDATION_ERROR');
    expect(operation(routes[6]).description).toContain('204');
  });

  it('returns the User on GET /me', () => {
    expect(propertiesOf(jsonSchema(routes[4], '200'))).toEqual(
      expect.arrayContaining(['id', 'email', 'phone', 'updatedAt']),
    );
    expectErrorResponse(routes[4], '401', 'UNAUTHORIZED');
  });

  it('returns the updated User on PATCH /me, with its errors', () => {
    expect(propertiesOf(jsonSchema(routes[5], '200'))).toEqual(
      expect.arrayContaining(['id', 'email', 'phone', 'updatedAt']),
    );
    expect(propertiesOf(jsonSchema(routes[5], '200'))).not.toContain(
      'passwordHash',
    );
    expectErrorResponse(routes[5], '400', 'VALIDATION_ERROR');
    expectErrorResponse(routes[5], '401', 'UNAUTHORIZED');
    expectErrorResponse(routes[5], '403', 'WRONG_PASSWORD');
    expectErrorResponse(routes[5], '409', 'EMAIL_ALREADY_USED');
  });

  it('documents the optional fields of the PATCH /me body', () => {
    const body = operation(routes[5]).requestBody;
    if (!body || !('content' in body)) {
      throw new Error('No request body for PATCH /me');
    }
    const schema = resolve(body.content['application/json']?.schema);

    expect(propertiesOf(schema)).toEqual([
      'email',
      'firstName',
      'lastName',
      'phone',
      'currentPassword',
    ]);
    expect(schema?.required ?? []).toEqual([]);
    expect(schema?.additionalProperties).toBe(false);
    expect(operation(routes[5]).description).toContain('currentPassword');
  });

  it('resolves the security of every operation from its handler', () => {
    const operations = Object.values(document.paths).flatMap((pathItem) =>
      (['get', 'post', 'put', 'patch', 'delete'] as const).flatMap(
        (method) => pathItem[method] ?? [],
      ),
    );

    for (const { operationId, security, responses } of operations) {
      expect({
        operationId,
        resolved: security !== undefined || '401' in responses,
      }).toEqual({ operationId, resolved: true });
    }
  });

  it('requires the bearer access token by default', () => {
    expect(document.security).toEqual([{ bearer: [] }]);
  });

  it.each([
    [routes[0], []],
    [routes[1], []],
    [routes[2], [{ cookie: [] }]],
    [routes[3], [{ cookie: [] }]],
    [routes[4], undefined],
    [routes[5], undefined],
    [routes[6], []],
  ] as const)('declares the security of %j', (route, security) => {
    expect(operation(route).security).toEqual(security);
  });

  it('documents 400 VALIDATION_ERROR only on routes with a body', () => {
    expect(routes.filter((route) => operation(route).responses['400'])).toEqual(
      [routes[0], routes[1], routes[5], routes[6]],
    );
  });

  it.each([
    [routes[0], '409', 'EMAIL_ALREADY_USED'],
    [routes[1], '400', 'VALIDATION_ERROR'],
    [routes[2], '401', 'INVALID_REFRESH_TOKEN'],
    [routes[4], '401', 'UNAUTHORIZED'],
    [routes[5], '403', 'WRONG_PASSWORD'],
    [routes[5], '409', 'EMAIL_ALREADY_USED'],
  ] as const)('shows %j %s with a %s example', (route, status, code) => {
    const examples = response(route, status).content?.['application/json']
      ?.examples as Record<string, { value: { error: { code: string } } }>;

    expect(Object.keys(examples)).toEqual([code]);
    expect(examples[code]?.value.error.code).toBe(code);
  });

  it('removes the error codes extension from the document', () => {
    expect(JSON.stringify(document)).not.toContain('x-error-codes');
  });

  it('documents GET /events as public, paginated and validated', () => {
    const route: Route = ['get', '/events'];
    const { tags, security, parameters } = operation(route);

    expect(tags).toEqual(['Events']);
    expect(security).toEqual([]);
    expect(Object.keys(operation(route).responses).sort()).toEqual([
      '200',
      '400',
    ]);
    expect(propertiesOf(jsonSchema(route, '200'))).toEqual(['data', 'meta']);
    expect(
      (parameters ?? []).map((parameter) =>
        'name' in parameter ? [parameter.name, parameter.in] : [],
      ),
    ).toEqual([
      ['page', 'query'],
      ['limit', 'query'],
      ['user_id', 'query'],
    ]);
    expectErrorResponse(route, '400', 'VALIDATION_ERROR');
  });

  it('documents GET /events/{id} as public, with the Event and its errors', () => {
    const route: Route = ['get', '/events/{id}'];
    const { tags, security, summary, parameters } = operation(route);

    expect(tags).toEqual(['Events']);
    expect(security).toEqual([]);
    expect(summary).toBe('Consulter un événement');
    expect(Object.keys(operation(route).responses).sort()).toEqual([
      '200',
      '400',
      '404',
    ]);
    expect(
      (parameters ?? []).map((parameter) =>
        'name' in parameter ? [parameter.name, parameter.in] : [],
      ),
    ).toEqual([['id', 'path']]);
    const event = propertiesOf(jsonSchema(route, '200'));
    expect(event).toEqual(
      expect.arrayContaining([
        'description',
        'endsAt',
        'location',
        'organizer',
      ]),
    );
    expect(event).not.toContain('ticketCategories');
    expect(
      propertiesOf(
        jsonSchema(route, '200').properties?.organizer as SchemaObject,
      ),
    ).toEqual(['id', 'firstName', 'lastName']);
    expectErrorResponse(route, '400', 'VALIDATION_ERROR');
    expectErrorResponse(route, '404', 'EVENT_NOT_FOUND');
  });

  it('documents POST /events for connected users, with the created Event', () => {
    const route: Route = ['post', '/events'];
    const { tags, security, summary } = operation(route);

    expect(tags).toEqual(['Events']);
    expect(security).toBeUndefined();
    expect(summary).toBe('Créer un événement');
    expect(Object.keys(operation(route).responses).sort()).toEqual([
      '201',
      '400',
      '401',
    ]);
    expect(propertiesOf(jsonSchema(route, '201'))).toEqual(
      expect.arrayContaining(['id', 'status', 'location', 'organizer']),
    );
    expectErrorResponse(route, '400', 'VALIDATION_ERROR');
    expectErrorResponse(route, '401', 'UNAUTHORIZED');
  });

  it('declares the shared ErrorResponse component once', () => {
    expect(document.components?.schemas).toHaveProperty('ErrorResponse');
  });
});
