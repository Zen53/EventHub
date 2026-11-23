import type { EventSummary } from '@eventhub/schemas';
import type { EventRow } from './events.schema.js';

export function toEventSummary(row: EventRow): EventSummary {
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
