import { eventSummarySchema } from '@eventhub/schemas';
import { toEventSummary } from './event.dto.js';
import type { EventRow } from './events.schema.js';

const row: EventRow = {
  id: '3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90',
  title: 'Concert de jazz',
  startsAt: new Date('2026-12-05T19:30:00Z'),
  city: 'Lyon',
  imageUrl: 'https://exemple.fr/jazz.jpg',
  type: 'concert',
  status: 'published',
  organizerId: 'a1b2c3d4-0000-4000-8000-000000000001',
  createdAt: new Date('2026-11-13T10:00:00Z'),
  updatedAt: new Date('2026-11-14T08:30:00Z'),
};

describe('toEventSummary', () => {
  it('returns the contract EventSummary with an ISO start date and a free minimum price', () => {
    const summary = toEventSummary(row);

    expect(summary).toEqual({
      id: row.id,
      title: 'Concert de jazz',
      startsAt: '2026-12-05T19:30:00.000Z',
      city: 'Lyon',
      imageUrl: 'https://exemple.fr/jazz.jpg',
      type: 'concert',
      status: 'published',
      minPriceCents: 0,
    });
    expect(eventSummarySchema.safeParse(summary).success).toBe(true);
  });

  it('keeps a null imageUrl', () => {
    expect(toEventSummary({ ...row, imageUrl: null }).imageUrl).toBeNull();
  });

  it('keeps a cancelled status', () => {
    expect(toEventSummary({ ...row, status: 'cancelled' }).status).toBe(
      'cancelled',
    );
  });

  it('exposes neither the organizer nor the technical dates', () => {
    const summary = toEventSummary(row);

    expect(summary).not.toHaveProperty('organizerId');
    expect(summary).not.toHaveProperty('createdAt');
    expect(summary).not.toHaveProperty('updatedAt');
  });
});
