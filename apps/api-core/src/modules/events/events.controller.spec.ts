import {
  eventsListResponseSchema,
  listEventsQuerySchema,
} from '@eventhub/schemas';
import { RequestMethod } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { AppError } from '../../core/errors/app-error.js';
import { IS_PUBLIC_KEY } from '../../core/security/public.decorator.js';
import { createValidationPipe } from '../../core/validation/validation.pipe.js';
import { EventsController } from './events.controller.js';
import { EventsModule } from './events.module.js';
import type { EventRow } from './events.schema.js';
import type { EventsService } from './events.service.js';

const row: EventRow = {
  id: '3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90',
  title: 'Concert de jazz',
  startsAt: new Date('2026-12-05T19:30:00Z'),
  city: 'Lyon',
  imageUrl: null,
  type: 'concert',
  status: 'published',
  organizerId: 'a1b2c3d4-0000-4000-8000-000000000001',
  createdAt: new Date('2026-11-13T10:00:00Z'),
  updatedAt: new Date('2026-11-13T10:00:00Z'),
};

function setup() {
  const events = {
    listUpcoming: vi.fn().mockResolvedValue({
      rows: [row],
      meta: { page: 1, limit: 20, total: 1 },
    }),
  };
  const controller = new EventsController(events as unknown as EventsService);
  return { controller, events };
}

function querySchema() {
  const args = Object.values(
    Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      EventsController,
      'list',
    ) as Record<string, { index: number; schema?: unknown }>,
  );
  return args.find((arg) => arg.index === 0)?.schema;
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
    expect(querySchema()).toBe(listEventsQuerySchema);
  });

  it('applies the defaults and coerces the strings', async () => {
    await expect(validateQuery({})).resolves.toEqual({ page: 1, limit: 20 });
    await expect(validateQuery({ page: '2', limit: '5' })).resolves.toEqual({
      page: 2,
      limit: 5,
    });
  });

  it.each([
    [{ limit: '51' }, 'limit'],
    [{ page: '0' }, 'page'],
    [{ page: 'abc' }, 'page'],
    [{ user_id: 'a1b2c3d4-0000-4000-8000-000000000001' }, 'user_id'],
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

describe('EventsController routing', () => {
  const reflector = new Reflector();
  const handler = Object.getOwnPropertyDescriptor(
    EventsController.prototype,
    'list',
  )?.value as () => unknown;

  it('is mounted on GET /events', () => {
    expect(reflector.get('path', EventsController)).toBe('events');
    expect(reflector.get('path', handler)).toBe('/');
    expect(reflector.get('method', handler)).toBe(RequestMethod.GET);
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
