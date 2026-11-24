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
    description:
      "Une nuit de sets électro sur deux scènes, des premières parties locales jusqu'au lever du jour.",
    locationName: 'Le Transbordeur',
    locationAddress: '3 boulevard de Stalingrad, 69100 Villeurbanne',
    type: 'concert',
    imageUrl: image('electro'),
    daysFromNow: 3,
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    title: 'Le Misanthrope',
    city: 'Paris',
    description:
      "La comédie de Molière dans une mise en scène contemporaine, suivie d'un échange avec la troupe.",
    locationName: "Théâtre de l'Atelier",
    locationAddress: '1 place Charles Dullin, 75018 Paris',
    type: 'theatre',
    imageUrl: image('misanthrope'),
    daysFromNow: 7,
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    title: 'Semi-marathon des quais',
    city: 'Bordeaux',
    description:
      'Un semi-marathon le long de la Garonne, ouvert à tous les niveaux, avec ravitaillements tous les 5 km.',
    locationName: 'Quai des Chartrons',
    locationAddress: 'Quai des Chartrons, 33000 Bordeaux',
    type: 'sport',
    imageUrl: null,
    daysFromNow: 12,
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    title: 'Conférence TypeScript et ESM',
    city: 'Nantes',
    description:
      'Une journée de talks sur la migration vers ESM et le typage strict dans les projets TypeScript.',
    locationName: 'Cité des Congrès',
    locationAddress: '5 rue de Valmy, 44000 Nantes',
    type: 'conference',
    imageUrl: image('typescript'),
    daysFromNow: 18,
  },
  {
    id: '00000000-0000-4000-8000-000000000105',
    title: 'Festival des lumières du port',
    city: 'Marseille',
    description:
      'Installations lumineuses et concerts sur le Vieux-Port, trois soirs de suite.',
    locationName: 'Vieux-Port',
    locationAddress: 'Quai du Port, 13002 Marseille',
    type: 'festival',
    imageUrl: image('lumieres'),
    daysFromNow: 25,
  },
  {
    id: '00000000-0000-4000-8000-000000000106',
    title: 'Atelier poterie du dimanche',
    city: 'Toulouse',
    description:
      'Initiation au tour et au modelage, matériel fourni, en petit groupe de huit personnes.',
    locationName: 'Atelier Terre & Feu',
    locationAddress: '12 rue des Potiers, 31000 Toulouse',
    type: 'other',
    imageUrl: null,
    daysFromNow: 31,
  },
  {
    id: '00000000-0000-4000-8000-000000000107',
    title: 'Quatuor à cordes en plein air',
    city: 'Strasbourg',
    description:
      'Un quatuor à cordes joue Haydn et Debussy au coucher du soleil.',
    locationName: "Parc de l'Orangerie",
    locationAddress: "Avenue de l'Europe, 67000 Strasbourg",
    type: 'concert',
    imageUrl: image('quatuor'),
    daysFromNow: 40,
  },
  {
    id: '00000000-0000-4000-8000-000000000108',
    title: 'Tournoi de basket 3x3',
    city: 'Lille',
    description:
      "Tournoi de basket 3x3 par équipes, inscriptions sur place jusqu'à midi.",
    locationName: 'Gare Saint-Sauveur',
    locationAddress: '17 boulevard Jean-Baptiste Lebas, 59000 Lille',
    type: 'sport',
    imageUrl: image('basket'),
    status: 'cancelled',
    daysFromNow: 45,
  },
  {
    id: '00000000-0000-4000-8000-000000000109',
    title: 'Impro au café-théâtre',
    city: 'Montpellier',
    description:
      "Deux équipes d'improvisateurs s'affrontent sur les thèmes proposés par le public.",
    locationName: 'Café-théâtre de la Comédie',
    locationAddress: '8 place de la Comédie, 34000 Montpellier',
    type: 'theatre',
    imageUrl: image('impro'),
    daysFromNow: 60,
  },
  {
    id: '00000000-0000-4000-8000-000000000110',
    title: 'Rencontres de la data ouverte',
    city: 'Rennes',
    description:
      "Retours d'expérience sur l'ouverture des données publiques et ateliers de visualisation.",
    locationName: 'Couvent des Jacobins',
    locationAddress: '20 place Sainte-Anne, 35000 Rennes',
    type: 'conference',
    imageUrl: null,
    daysFromNow: 90,
  },
  {
    id: '00000000-0000-4000-8000-000000000111',
    title: 'Brocante du printemps',
    city: 'Nice',
    description:
      'Plus de deux cents exposants, vinyles, mobilier et objets chinés.',
    locationName: 'Cours Saleya',
    locationAddress: 'Cours Saleya, 06300 Nice',
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
