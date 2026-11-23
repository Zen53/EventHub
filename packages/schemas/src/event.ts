import { z } from 'zod';

export const eventTypes = [
  'concert',
  'theatre',
  'sport',
  'conference',
  'festival',
  'other',
] as const;

export const eventStatuses = ['published', 'cancelled'] as const;

export const eventTypeSchema = z.enum(eventTypes);

export type EventType = z.infer<typeof eventTypeSchema>;

export const eventStatusSchema = z.enum(eventStatuses);

export type EventStatus = z.infer<typeof eventStatusSchema>;

export const eventSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  startsAt: z.iso.datetime(),
  city: z.string(),
  imageUrl: z.string().nullable(),
  type: eventTypeSchema,
  status: eventStatusSchema,
  minPriceCents: z.int().min(0),
});

export type EventSummary = z.infer<typeof eventSummarySchema>;

export const locationSchema = z.object({
  name: z.string(),
  address: z.string(),
  city: z.string(),
});

export type Location = z.infer<typeof locationSchema>;

export const organizerSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
});

export type Organizer = z.infer<typeof organizerSchema>;

export const eventSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().nullable(),
  location: locationSchema,
  imageUrl: z.string().nullable(),
  type: eventTypeSchema,
  status: eventStatusSchema,
  organizer: organizerSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Event = z.infer<typeof eventSchema>;

export const eventIdParamsSchema = z.strictObject({
  id: z.uuid({ error: "L'identifiant de l'événement doit être un UUID." }),
});

export type EventIdParams = z.infer<typeof eventIdParamsSchema>;

export const EVENTS_MAX_LIMIT = 50;

export const listEventsQuerySchema = z.strictObject({
  page: z.coerce
    .number({ error: 'La page doit être un entier.' })
    .int('La page doit être un entier.')
    .min(1, 'La page doit être supérieure ou égale à 1.')
    .default(1),
  limit: z.coerce
    .number({ error: 'La limite doit être un entier.' })
    .int('La limite doit être un entier.')
    .min(1, 'La limite doit être comprise entre 1 et 50.')
    .max(EVENTS_MAX_LIMIT, 'La limite doit être comprise entre 1 et 50.')
    .default(20),
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

export const paginationMetaSchema = z.object({
  page: z.int().min(1),
  limit: z.int().min(1),
  total: z.int().min(0),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export const eventsListResponseSchema = z.object({
  data: z.array(eventSummarySchema),
  meta: paginationMetaSchema,
});

export type EventsListResponse = z.infer<typeof eventsListResponseSchema>;
