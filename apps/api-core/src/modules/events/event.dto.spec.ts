import { eventSchema, eventSummarySchema } from '@eventhub/schemas';
import { toEvent, toEventSummary } from './event.dto.js';
import type { EventDetailRow, EventSummaryRow } from './events.schema.js';

const row: EventSummaryRow = {
  id: '3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90',
  title: 'Concert de jazz',
  startsAt: new Date('2026-12-05T19:30:00Z'),
  city: 'Lyon',
  imageUrl: 'https://exemple.fr/jazz.jpg',
  type: 'concert',
  status: 'published',
};

const detail: EventDetailRow = {
  ...row,
  description: 'Une soirée jazz avec le quartet de Lyon.',
  endsAt: new Date('2026-12-05T22:00:00Z'),
  locationName: 'Salle Molière',
  locationAddress: '18 quai de Bondy',
  organizer: {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    firstName: 'Dalyll',
    lastName: 'Martin',
  },
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
    const summary = toEventSummary(detail);

    expect(summary).not.toHaveProperty('organizerId');
    expect(summary).not.toHaveProperty('createdAt');
    expect(summary).not.toHaveProperty('updatedAt');
  });
});

describe('toEvent', () => {
  it('returns the contract Event with ISO dates, the location and the organizer', () => {
    const event = toEvent(detail);

    expect(event).toEqual({
      id: detail.id,
      title: 'Concert de jazz',
      description: 'Une soirée jazz avec le quartet de Lyon.',
      startsAt: '2026-12-05T19:30:00.000Z',
      endsAt: '2026-12-05T22:00:00.000Z',
      location: {
        name: 'Salle Molière',
        address: '18 quai de Bondy',
        city: 'Lyon',
      },
      imageUrl: 'https://exemple.fr/jazz.jpg',
      type: 'concert',
      status: 'published',
      organizer: {
        id: 'a1b2c3d4-0000-4000-8000-000000000001',
        firstName: 'Dalyll',
        lastName: 'Martin',
      },
      createdAt: '2026-11-13T10:00:00.000Z',
      updatedAt: '2026-11-14T08:30:00.000Z',
    });
    expect(eventSchema.safeParse(event).success).toBe(true);
  });

  it('returns a null endsAt and a null imageUrl when they are absent', () => {
    const event = toEvent({ ...detail, endsAt: null, imageUrl: null });

    expect(event.endsAt).toBeNull();
    expect(event.imageUrl).toBeNull();
    expect(eventSchema.safeParse(event).success).toBe(true);
  });

  it('keeps a cancelled status', () => {
    expect(toEvent({ ...detail, status: 'cancelled' }).status).toBe(
      'cancelled',
    );
  });

  it('exposes only the public fields of the organizer', () => {
    const organizer = { ...detail.organizer, email: 'dalyll@exemple.fr' };

    expect(toEvent({ ...detail, organizer }).organizer).toEqual(
      detail.organizer,
    );
  });

  it('exposes no ticketing field', () => {
    const event = toEvent(detail);

    expect(event).not.toHaveProperty('ticketCategories');
    expect(event).not.toHaveProperty('totalCapacity');
    expect(event).not.toHaveProperty('maxTicketsPerReservation');
  });
});
