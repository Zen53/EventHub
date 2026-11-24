import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventBodySchema, createEventResponseSchema } from './event.js';

const body = {
  title: 'Concert de jazz',
  description: 'Une soirée jazz avec le quartet de Lyon.',
  startsAt: '2026-12-05T19:30:00Z',
  endsAt: '2026-12-05T22:00:00Z',
  location: {
    name: 'Salle Molière',
    address: '18 quai de Bondy',
    city: 'Lyon',
  },
  imageUrl: 'https://exemple.fr/jazz.jpg',
  type: 'concert',
};

function issuesOf(value: unknown) {
  const result = createEventBodySchema.safeParse(value);
  expect(result.success).toBe(false);
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

describe('createEventBodySchema', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-24T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts the contract body without ticketing', () => {
    expect(createEventBodySchema.parse(body)).toEqual(body);
  });

  it('accepts a body without endsAt and imageUrl', () => {
    const { endsAt: _endsAt, imageUrl: _imageUrl, ...minimal } = body;

    expect(createEventBodySchema.parse(minimal)).toEqual(minimal);
  });

  it('accepts a null endsAt and a null imageUrl', () => {
    const nulls = { ...body, endsAt: null, imageUrl: null };

    expect(createEventBodySchema.parse(nulls)).toEqual(nulls);
  });

  it('trims the text fields', () => {
    const parsed = createEventBodySchema.parse({
      ...body,
      title: '  Concert de jazz  ',
      location: { ...body.location, city: ' Lyon ' },
    });

    expect(parsed.title).toBe('Concert de jazz');
    expect(parsed.location.city).toBe('Lyon');
  });

  it.each([
    [{ title: undefined }, 'title', 'Le titre est obligatoire.'],
    [
      { title: ' ab ' },
      'title',
      'Le titre doit contenir au moins 3 caractères.',
    ],
    [
      { title: 'a'.repeat(101) },
      'title',
      'Le titre doit contenir au plus 100 caractères.',
    ],
    [
      { description: ' Trop bref ' },
      'description',
      'La description doit contenir au moins 10 caractères.',
    ],
    [
      { description: 'a'.repeat(5001) },
      'description',
      'La description doit contenir au plus 5000 caractères.',
    ],
    [{ startsAt: undefined }, 'startsAt', 'La date de début est obligatoire.'],
    [
      { startsAt: '05/12/2026' },
      'startsAt',
      'La date de début doit être au format ISO 8601 en UTC, par exemple 2026-12-05T19:30:00Z.',
    ],
    [
      { startsAt: '2026-11-24T09:59:59Z', endsAt: null },
      'startsAt',
      'La date doit être dans le futur.',
    ],
    [
      { endsAt: '2026-12-05' },
      'endsAt',
      'La date de fin doit être au format ISO 8601 en UTC, par exemple 2026-12-05T19:30:00Z.',
    ],
    [
      { endsAt: '2026-12-05T19:30:00Z' },
      'endsAt',
      'La date de fin doit être postérieure à la date de début.',
    ],
    [
      { endsAt: '2026-12-05T18:00:00Z' },
      'endsAt',
      'La date de fin doit être postérieure à la date de début.',
    ],
    [{ location: undefined }, 'location', 'Le lieu est obligatoire.'],
    [
      { location: { ...body.location, name: 'Z' } },
      'location.name',
      'Le nom du lieu doit contenir au moins 2 caractères.',
    ],
    [
      { location: { ...body.location, address: '18 q' } },
      'location.address',
      "L'adresse doit contenir au moins 5 caractères.",
    ],
    [
      { location: { ...body.location, city: 'a'.repeat(101) } },
      'location.city',
      'La ville doit contenir au plus 100 caractères.',
    ],
    [
      { imageUrl: 'exemple.fr/jazz.jpg' },
      'imageUrl',
      "L'image doit être une URL http(s) valide.",
    ],
    [
      { imageUrl: 'ftp://exemple.fr/jazz.jpg' },
      'imageUrl',
      "L'image doit être une URL http(s) valide.",
    ],
    [
      { imageUrl: 'javascript:alert(1)' },
      'imageUrl',
      "L'image doit être une URL http(s) valide.",
    ],
    [
      { type: 'opera' },
      'type',
      'Le type doit valoir concert, theatre, sport, conference, festival, other.',
    ],
  ])('rejects %j on %s', (patch, path, message) => {
    expect(issuesOf({ ...body, ...patch })).toContainEqual({ path, message });
  });

  it('reports endsAt before startsAt along with another invalid field', () => {
    expect(
      issuesOf({ ...body, title: 'ab', endsAt: '2026-12-05T18:00:00Z' }),
    ).toEqual([
      {
        path: 'title',
        message: 'Le titre doit contenir au moins 3 caractères.',
      },
      {
        path: 'endsAt',
        message: 'La date de fin doit être postérieure à la date de début.',
      },
    ]);
  });

  it('does not compare the dates when startsAt is invalid', () => {
    expect(issuesOf({ ...body, startsAt: 'demain' })).toEqual([
      {
        path: 'startsAt',
        message:
          'La date de début doit être au format ISO 8601 en UTC, par exemple 2026-12-05T19:30:00Z.',
      },
    ]);
  });

  it.each([
    ['status', { status: 'cancelled' }],
    ['organizer', { organizer: { id: 'x' } }],
    ['ticketCategories', { ticketCategories: [] }],
    ['maxTicketsPerReservation', { maxTicketsPerReservation: 4 }],
  ])('rejects the field %s that the client does not send', (key, patch) => {
    const result = createEventBodySchema.safeParse({ ...body, ...patch });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        code: 'unrecognized_keys',
        path: [],
        keys: [key],
      }),
    ]);
  });

  it('rejects an unknown field in location', () => {
    const result = createEventBodySchema.safeParse({
      ...body,
      location: { ...body.location, country: 'FR' },
    });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        code: 'unrecognized_keys',
        path: ['location'],
        keys: ['country'],
      }),
    ]);
  });

  it.each([null, 'concert', []])('rejects a non object body %j', (value) => {
    expect(issuesOf(value)).toEqual([
      { path: '', message: 'Le corps de la requête doit être un objet JSON.' },
    ]);
  });
});

describe('createEventResponseSchema', () => {
  it('accepts the contract Event returned with 201', () => {
    const event = {
      id: '3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90',
      ...body,
      status: 'published',
      organizer: {
        id: 'a1b2c3d4-0000-4000-8000-000000000001',
        firstName: 'Dalyll',
        lastName: 'Martin',
      },
      createdAt: '2026-11-24T10:00:00Z',
      updatedAt: '2026-11-24T10:00:00Z',
    };

    expect(createEventResponseSchema.parse(event)).toEqual(event);
  });
});
