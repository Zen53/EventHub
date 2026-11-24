import {
  createEventBodySchema,
  createEventResponseSchema,
  eventIdParamsSchema,
  eventSchema,
  eventsListResponseSchema,
  listEventsQuerySchema,
} from '@eventhub/schemas';
import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { AppError } from '../../core/errors/app-error.js';
import { IS_PUBLIC_KEY } from '../../core/security/public.decorator.js';
import { createValidationPipe } from '../../core/validation/validation.pipe.js';
import { EventsController } from './events.controller.js';
import { EventsModule } from './events.module.js';
import type { EventDetailRow, EventSummaryRow } from './events.schema.js';
import type { EventsService } from './events.service.js';

const row: EventSummaryRow = {
  id: '3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90',
  title: 'Concert de jazz',
  startsAt: new Date('2026-12-05T19:30:00Z'),
  city: 'Lyon',
  imageUrl: null,
  type: 'concert',
  status: 'published',
};

const detail: EventDetailRow = {
  ...row,
  description: 'Une soirée jazz avec le quartet de Lyon.',
  endsAt: null,
  locationName: 'Salle Molière',
  locationAddress: '18 quai de Bondy',
  status: 'cancelled',
  organizer: {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    firstName: 'Dalyll',
    lastName: 'Martin',
  },
  createdAt: new Date('2026-11-13T10:00:00Z'),
  updatedAt: new Date('2026-11-13T10:00:00Z'),
};

const created: EventDetailRow = {
  ...detail,
  endsAt: new Date('2026-12-05T22:00:00Z'),
  status: 'published',
};

const createBody = {
  title: 'Concert de jazz',
  description: 'Une soirée jazz avec le quartet de Lyon.',
  startsAt: '2026-12-05T19:30:00Z',
  endsAt: '2026-12-05T22:00:00Z',
  location: {
    name: 'Salle Molière',
    address: '18 quai de Bondy',
    city: 'Lyon',
  },
  imageUrl: null,
  type: 'concert' as const,
};

function setup() {
  const events = {
    listUpcoming: vi.fn().mockResolvedValue({
      rows: [row],
      meta: { page: 1, limit: 20, total: 1 },
    }),
    getById: vi.fn().mockResolvedValue(detail),
    create: vi.fn().mockResolvedValue(created),
  };
  const controller = new EventsController(events as unknown as EventsService);
  return { controller, events };
}

function argSchema(method: 'list' | 'getById' | 'create', index = 0) {
  const args = Object.values(
    Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      EventsController,
      method,
    ) as Record<string, { index: number; schema?: unknown }>,
  );
  return args.find((arg) => arg.index === index)?.schema;
}

function validateParams(params: Record<string, unknown>) {
  return createValidationPipe().transform(params, {
    type: 'param',
    schema: eventIdParamsSchema,
  });
}

function validateBody(body: Record<string, unknown>) {
  return createValidationPipe().transform(body, {
    type: 'body',
    schema: createEventBodySchema,
  });
}

function validateQuery(query: Record<string, unknown>) {
  return createValidationPipe().transform(query, {
    type: 'query',
    schema: listEventsQuerySchema,
  });
}

describe('EventsController.list', () => {
  it('returns the upcoming events as EventSummary with the pagination meta', async () => {
    const { controller, events } = setup();

    const response = await controller.list({ page: 1, limit: 20 });

    expect(events.listUpcoming).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(response).toEqual({
      data: [
        {
          id: row.id,
          title: 'Concert de jazz',
          startsAt: '2026-12-05T19:30:00.000Z',
          city: 'Lyon',
          imageUrl: null,
          type: 'concert',
          status: 'published',
          minPriceCents: 0,
        },
      ],
      meta: { page: 1, limit: 20, total: 1 },
    });
    expect(eventsListResponseSchema.safeParse(response).success).toBe(true);
  });

  it('returns an empty page when there is no upcoming event', async () => {
    const { controller, events } = setup();
    events.listUpcoming.mockResolvedValue({
      rows: [],
      meta: { page: 1, limit: 20, total: 0 },
    });

    await expect(controller.list({ page: 1, limit: 20 })).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
  });
});

describe('EventsController query validation', () => {
  it('validates the query with listEventsQuerySchema', () => {
    expect(argSchema('list')).toBe(listEventsQuerySchema);
  });

  it('applies the defaults and coerces the strings', async () => {
    await expect(validateQuery({})).resolves.toEqual({ page: 1, limit: 20 });
    await expect(validateQuery({ page: '2', limit: '5' })).resolves.toEqual({
      page: 2,
      limit: 5,
    });
  });

  it('keeps a valid user_id', async () => {
    const userId = 'a1b2c3d4-0000-4000-8000-000000000001';
    await expect(validateQuery({ user_id: userId })).resolves.toEqual({
      page: 1,
      limit: 20,
      user_id: userId,
    });
  });

  it.each([
    [{ limit: '51' }, 'limit'],
    [{ page: '0' }, 'page'],
    [{ page: 'abc' }, 'page'],
    [{ user_id: 'abc' }, 'user_id'],
    [{ city: 'Lyon' }, 'city'],
  ])('throws 400 VALIDATION_ERROR for %j', async (query, field) => {
    const promise = validateQuery(query);

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [expect.objectContaining({ field })],
    });
  });
});

describe('EventsController.getById', () => {
  it('returns the contract Event of the requested id', async () => {
    const { controller, events } = setup();

    const response = await controller.getById({ id: row.id });

    expect(events.getById).toHaveBeenCalledWith(row.id);
    expect(response).toMatchObject({
      id: row.id,
      endsAt: null,
      status: 'cancelled',
      location: {
        name: 'Salle Molière',
        address: '18 quai de Bondy',
        city: 'Lyon',
      },
      organizer: detail.organizer,
    });
    expect(eventSchema.safeParse(response).success).toBe(true);
  });

  it('lets the 404 EVENT_NOT_FOUND of the service through', async () => {
    const { controller, events } = setup();
    events.getById.mockRejectedValue(new AppError('EVENT_NOT_FOUND'));

    await expect(controller.getById({ id: row.id })).rejects.toMatchObject({
      status: 404,
      code: 'EVENT_NOT_FOUND',
    });
  });
});

describe('EventsController params validation', () => {
  it('validates the params with eventIdParamsSchema', () => {
    expect(argSchema('getById')).toBe(eventIdParamsSchema);
  });

  it('accepts a UUID', async () => {
    await expect(validateParams({ id: row.id })).resolves.toEqual({
      id: row.id,
    });
  });

  it('throws 400 VALIDATION_ERROR on the id when it is not a UUID', async () => {
    const promise = validateParams({ id: 'abc' });

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [expect.objectContaining({ field: 'id' })],
    });
  });
});

describe('EventsController.create', () => {
  it('creates the event for the connected user and returns the full Event', async () => {
    const { controller, events } = setup();

    const response = await controller.create(
      { userId: detail.organizer.id },
      createBody,
    );

    expect(events.create).toHaveBeenCalledWith(detail.organizer.id, createBody);
    expect(response).toMatchObject({
      id: row.id,
      startsAt: '2026-12-05T19:30:00.000Z',
      endsAt: '2026-12-05T22:00:00.000Z',
      status: 'published',
      organizer: detail.organizer,
    });
    expect(createEventResponseSchema.safeParse(response).success).toBe(true);
  });
});

describe('EventsController body validation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-24T10:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('validates the body with createEventBodySchema', () => {
    expect(argSchema('create', 1)).toBe(createEventBodySchema);
  });

  it('accepts a valid body', async () => {
    await expect(validateBody(createBody)).resolves.toEqual(createBody);
  });

  it.each([
    [{ startsAt: '2026-11-24T09:59:59Z', endsAt: null }, 'startsAt'],
    [{ endsAt: '2026-12-05T19:30:00Z' }, 'endsAt'],
    [{ endsAt: '2026-12-05T18:00:00Z' }, 'endsAt'],
  ])('throws 400 VALIDATION_ERROR for %j', async (patch, field) => {
    const promise = validateBody({ ...createBody, ...patch });

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [expect.objectContaining({ field })],
    });
  });
});

describe('EventsController routing', () => {
  const reflector = new Reflector();
  const handlerOf = (method: 'list' | 'getById' | 'create') =>
    Object.getOwnPropertyDescriptor(EventsController.prototype, method)
      ?.value as () => unknown;
  const handler = handlerOf('list');

  it('is mounted on GET /events', () => {
    expect(reflector.get('path', EventsController)).toBe('events');
    expect(reflector.get('path', handler)).toBe('/');
    expect(reflector.get('method', handler)).toBe(RequestMethod.GET);
  });

  it('mounts getById on GET /events/:id, public', () => {
    const getById = handlerOf('getById');

    expect(reflector.get('path', getById)).toBe(':id');
    expect(reflector.get('method', getById)).toBe(RequestMethod.GET);
    expect(reflector.get(IS_PUBLIC_KEY, getById)).toBe(true);
  });

  it('mounts create on POST /events with 201, for connected users only', () => {
    const create = handlerOf('create');

    expect(reflector.get('path', create)).toBe('/');
    expect(reflector.get('method', create)).toBe(RequestMethod.POST);
    expect(reflector.get(HTTP_CODE_METADATA, create)).toBe(HttpStatus.CREATED);
    expect(reflector.get(IS_PUBLIC_KEY, create)).toBeUndefined();
  });

  it('is registered in EventsModule', () => {
    expect(reflector.get('controllers', EventsModule)).toContain(
      EventsController,
    );
  });

  it('is public', () => {
    expect(reflector.get(IS_PUBLIC_KEY, handler)).toBe(true);
  });
});
