import { eventStatuses, eventTypes } from '@eventhub/schemas';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { type UserRow, users } from '../users/users.schema.js';

export const eventType = pgEnum('event_type', eventTypes);

export const eventStatus = pgEnum('event_status', eventStatuses);

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 100 }).notNull(),
    description: text('description').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    locationName: varchar('location_name', { length: 100 }).notNull(),
    locationAddress: varchar('location_address', { length: 200 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    imageUrl: text('image_url'),
    type: eventType('type').notNull(),
    status: eventStatus('status').notNull().default('published'),
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('events_starts_at_idx').on(table.startsAt)],
);

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;

export type EventSummaryRow = Pick<
  EventRow,
  'id' | 'title' | 'startsAt' | 'city' | 'imageUrl' | 'type' | 'status'
>;

export type EventDetailRow = Omit<EventRow, 'organizerId'> & {
  organizer: Pick<UserRow, 'id' | 'firstName' | 'lastName'>;
};
