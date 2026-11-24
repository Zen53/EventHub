import { z } from 'zod';
import { strictBodyError } from './body.js';

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

const boundedTextSchema = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} est obligatoire.` })
    .trim()
    .min(min, `${label} doit contenir au moins ${min} caractères.`)
    .max(max, `${label} doit contenir au plus ${max} caractères.`);

const isoDateSchema = (label: string) =>
  z.iso.datetime({
    abort: true,
    error: (issue) =>
      issue.input === undefined
        ? `${label} est obligatoire.`
        : `${label} doit être au format ISO 8601 en UTC, par exemple 2026-12-05T19:30:00Z.`,
  });

export const createLocationBodySchema = z.strictObject(
  {
    name: boundedTextSchema('Le nom du lieu', 2, 100),
    address: boundedTextSchema("L'adresse", 5, 200),
    city: boundedTextSchema('La ville', 2, 100),
  },
  {
    error: (issue) =>
      issue.code === 'invalid_type' ? 'Le lieu est obligatoire.' : undefined,
  },
);

export type CreateLocationBody = z.infer<typeof createLocationBodySchema>;

export const createEventBodySchema = z
  .strictObject(
    {
      title: boundedTextSchema('Le titre', 3, 100),
      description: boundedTextSchema('La description', 10, 5000),
      startsAt: isoDateSchema('La date de début').refine(
        (startsAt) => Date.parse(startsAt) > Date.now(),
        'La date doit être dans le futur.',
      ),
      endsAt: isoDateSchema('La date de fin').nullable().optional(),
      location: createLocationBodySchema,
      imageUrl: z
        .url({
          protocol: /^https?$/,
          error: "L'image doit être une URL http(s) valide.",
        })
        .nullable()
        .optional(),
      type: z.enum(eventTypes, {
        error: `Le type doit valoir ${eventTypes.join(', ')}.`,
      }),
    },
    { error: strictBodyError },
  )
  .refine(
    (body) =>
      body.endsAt == null || Date.parse(body.endsAt) > Date.parse(body.startsAt),
    {
      path: ['endsAt'],
      message: 'La date de fin doit être postérieure à la date de début.',
      when: ({ value, issues }) =>
        typeof value === 'object' &&
        value !== null &&
        issues.every(
          (issue) =>
            issue.path?.[0] !== 'startsAt' && issue.path?.[0] !== 'endsAt',
        ),
    },
  );

export type CreateEventBody = z.infer<typeof createEventBodySchema>;

export const createEventResponseSchema = eventSchema;

export type CreateEventResponse = z.infer<typeof createEventResponseSchema>;

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
