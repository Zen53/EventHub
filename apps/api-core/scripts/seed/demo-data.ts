import type { NewEventRow } from '../../src/modules/events/events.schema.js';
import type { NewUserRow } from '../../src/modules/users/users.schema.js';

export const DEMO_ORGANIZER_ID = '00000000-0000-4000-8000-000000000001';

export const DEMO_ORGANIZER_PASSWORD = 'demo-password';

export const demoOrganizer: Omit<NewUserRow, 'passwordHash'> = {
  id: DEMO_ORGANIZER_ID,
  email: 'demo@eventhub.local',
  firstName: 'Demo',
  lastName: 'Organisateur',
};

const DAY_MS = 24 * 60 * 60 * 1000;

type DemoEvent = Omit<NewEventRow, 'startsAt' | 'organizerId'> & {
  id: string;
  daysFromNow: number;
};

const image = (slug: string): string =>
  `https://picsum.photos/seed/eventhub-${slug}/800/450`;

const demoEvents: DemoEvent[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    title: 'Nuit électro au Transbordeur',
    city: 'Lyon',
    type: 'concert',
    imageUrl: image('electro'),
    daysFromNow: 3,
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    title: 'Le Misanthrope',
    city: 'Paris',
    type: 'theatre',
    imageUrl: image('misanthrope'),
    daysFromNow: 7,
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    title: 'Semi-marathon des quais',
    city: 'Bordeaux',
    type: 'sport',
    imageUrl: null,
    daysFromNow: 12,
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    title: 'Conférence TypeScript et ESM',
    city: 'Nantes',
    type: 'conference',
    imageUrl: image('typescript'),
    daysFromNow: 18,
  },
  {
    id: '00000000-0000-4000-8000-000000000105',
    title: 'Festival des lumières du port',
    city: 'Marseille',
    type: 'festival',
    imageUrl: image('lumieres'),
    daysFromNow: 25,
  },
  {
    id: '00000000-0000-4000-8000-000000000106',
    title: 'Atelier poterie du dimanche',
    city: 'Toulouse',
    type: 'other',
    imageUrl: null,
    daysFromNow: 31,
  },
  {
    id: '00000000-0000-4000-8000-000000000107',
    title: 'Quatuor à cordes en plein air',
    city: 'Strasbourg',
    type: 'concert',
    imageUrl: image('quatuor'),
    daysFromNow: 40,
  },
  {
    id: '00000000-0000-4000-8000-000000000108',
    title: 'Tournoi de basket 3x3',
    city: 'Lille',
    type: 'sport',
    imageUrl: image('basket'),
    status: 'cancelled',
    daysFromNow: 45,
  },
  {
    id: '00000000-0000-4000-8000-000000000109',
    title: 'Impro au café-théâtre',
    city: 'Montpellier',
    type: 'theatre',
    imageUrl: image('impro'),
    daysFromNow: 60,
  },
  {
    id: '00000000-0000-4000-8000-000000000110',
    title: 'Rencontres de la data ouverte',
    city: 'Rennes',
    type: 'conference',
    imageUrl: null,
    daysFromNow: 90,
  },
  {
    id: '00000000-0000-4000-8000-000000000111',
    title: 'Brocante du printemps',
    city: 'Nice',
    type: 'festival',
    imageUrl: image('brocante'),
    daysFromNow: -30,
  },
];

export function buildDemoEvents(now: Date, organizerId: string): NewEventRow[] {
  return demoEvents.map(({ daysFromNow, ...event }) => {
    const startsAt = new Date(now.getTime() + daysFromNow * DAY_MS);
    startsAt.setUTCHours(18, 0, 0, 0);
    return { ...event, startsAt, organizerId };
  });
}
