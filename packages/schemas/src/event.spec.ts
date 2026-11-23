import { describe, expect, it } from 'vitest';
import {
  eventSummarySchema,
  eventsListResponseSchema,
  listEventsQuerySchema,
} from './event.js';

const summary = {
  id: '3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90',
  title: 'Concert de jazz',
  startsAt: '2026-12-05T19:30:00Z',
  city: 'Lyon',
  imageUrl: 'https://exemple.fr/jazz.jpg',
  type: 'concert',
  status: 'published',
  minPriceCents: 2500,
};

describe('event schemas', () => {
  describe('eventSummarySchema', () => {
    it('accepts the contract EventSummary', () => {
      expect(eventSummarySchema.safeParse(summary).success).toBe(true);
    });

    it('accepts a null imageUrl and a free event', () => {
      expect(
        eventSummarySchema.safeParse({
          ...summary,
          imageUrl: null,
          minPriceCents: 0,
        }).success,
      ).toBe(true);
    });

    it.each([
      { id: 'not-a-uuid' },
      { startsAt: '05/12/2026' },
      { imageUrl: undefined },
      { type: 'opera' },
      { status: 'draft' },
      { minPriceCents: -1 },
      { minPriceCents: 12.5 },
    ])('rejects %j', (patch) => {
      expect(
        eventSummarySchema.safeParse({ ...summary, ...patch }).success,
      ).toBe(false);
    });
  });

  describe('listEventsQuerySchema', () => {
    it('defaults to page 1 and limit 20', () => {
      expect(listEventsQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    });

    it('coerces the query strings to integers', () => {
      expect(listEventsQuerySchema.parse({ page: '3', limit: '50' })).toEqual({
        page: 3,
        limit: 50,
      });
    });

    it.each([
      [{ page: '0' }, 'page', 'La page doit être supérieure ou égale à 1.'],
      [{ page: '1.5' }, 'page', 'La page doit être un entier.'],
      [{ page: 'abc' }, 'page', 'La page doit être un entier.'],
      [{ limit: '0' }, 'limit', 'La limite doit être comprise entre 1 et 50.'],
      [{ limit: '51' }, 'limit', 'La limite doit être comprise entre 1 et 50.'],
    ])('rejects %j', (query, field, message) => {
      const result = listEventsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
      expect(result.error?.issues).toContainEqual(
        expect.objectContaining({ path: [field], message }),
      );
    });

    it('rejects an unknown parameter', () => {
      const result = listEventsQuerySchema.safeParse({ user_id: 'x' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].code).toBe('unrecognized_keys');
    });
  });

  describe('eventsListResponseSchema', () => {
    it('accepts a page of summaries with its meta', () => {
      expect(
        eventsListResponseSchema.safeParse({
          data: [summary],
          meta: { page: 1, limit: 20, total: 1 },
        }).success,
      ).toBe(true);
    });

    it('rejects a missing meta', () => {
      expect(eventsListResponseSchema.safeParse({ data: [] }).success).toBe(
        false,
      );
    });
  });
});
