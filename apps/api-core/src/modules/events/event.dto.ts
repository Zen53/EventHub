import type { Event, EventSummary, Organizer } from '@eventhub/schemas';
import type {
  EventDetailRow,
  EventSummaryRow,
  OrganizerRow,
} from './events.schema.js';

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

export function toOrganizer(row: OrganizerRow): Organizer {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
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
    organizer: toOrganizer(row.organizer),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
