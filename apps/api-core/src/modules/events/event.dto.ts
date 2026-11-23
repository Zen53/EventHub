import type { Event, EventSummary } from '@eventhub/schemas';
import type { EventDetailRow, EventSummaryRow } from './events.schema.js';

export function toEventSummary(row: EventSummaryRow): EventSummary {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.startsAt.toISOString(),
    city: row.city,
    imageUrl: row.imageUrl,
    type: row.type,
    status: row.status,
    minPriceCents: 0,
  };
}

export function toEvent(row: EventDetailRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    location: {
      name: row.locationName,
      address: row.locationAddress,
      city: row.city,
    },
    imageUrl: row.imageUrl,
    type: row.type,
    status: row.status,
    organizer: {
      id: row.organizer.id,
      firstName: row.organizer.firstName,
      lastName: row.organizer.lastName,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
