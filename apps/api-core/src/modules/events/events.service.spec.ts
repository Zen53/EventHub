import type { CreateEventBody } from '@eventhub/schemas';
import { AppError } from '../../core/errors/app-error.js';
import type { EventsRepository } from './events.repository.js';
import type { EventDetailRow, EventSummaryRow } from './events.schema.js';
import { EventsService } from './events.service.js';

const row = { id: '3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90' } as EventSummaryRow;
const detail = { id: row.id } as EventDetailRow;

function setup(total = 42) {
  const repository = {
    findUpcoming: vi.fn().mockResolvedValue({ rows: [row], total }),
    findById: vi.fn().mockResolvedValue(detail),
    insert: vi.fn().mockResolvedValue(detail),
    countUpcomingPublished: vi.fn().mockResolvedValue(0),
  };
  const service = new EventsService(repository as unknown as EventsRepository);
  return { service, repository };
}

describe('EventsService.listUpcoming', () => {
  it('reads the first page from offset 0', async () => {
    const { service, repository } = setup();

    await service.listUpcoming({ page: 1, limit: 20 });

    expect(repository.findUpcoming).toHaveBeenCalledWith(20, 0, undefined);
  });

  it('skips the previous pages', async () => {
    const { service, repository } = setup();

    await service.listUpcoming({ page: 3, limit: 10 });

    expect(repository.findUpcoming).toHaveBeenCalledWith(10, 20, undefined);
  });

  it('passes the user_id as the organizer to keep', async () => {
    const { service, repository } = setup();
    const userId = 'a1b2c3d4-0000-4000-8000-000000000001';

    await service.listUpcoming({ page: 1, limit: 20, user_id: userId });

    expect(repository.findUpcoming).toHaveBeenCalledWith(20, 0, userId);
  });

  it('returns the rows with the page, the limit and the total', async () => {
    const { service } = setup(42);

    await expect(service.listUpcoming({ page: 2, limit: 5 })).resolves.toEqual({
      rows: [row],
      meta: { page: 2, limit: 5, total: 42 },
    });
  });

  it('keeps the requested page when it is past the last one', async () => {
    const { service, repository } = setup(3);
    repository.findUpcoming.mockResolvedValue({ rows: [], total: 3 });

    await expect(service.listUpcoming({ page: 9, limit: 20 })).resolves.toEqual(
      { rows: [], meta: { page: 9, limit: 20, total: 3 } },
    );
  });
});

describe('EventsService.getById', () => {
  it('returns the event read by id', async () => {
    const { service, repository } = setup();

    await expect(service.getById(row.id)).resolves.toBe(detail);
    expect(repository.findById).toHaveBeenCalledWith(row.id);
  });

  it('throws 404 EVENT_NOT_FOUND when the event does not exist', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue(null);

    const promise = service.getById(row.id);

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 404,
      code: 'EVENT_NOT_FOUND',
    });
  });
});

describe('EventsService.create', () => {
  const organizerId = 'a1b2c3d4-0000-4000-8000-000000000001';
  const body: CreateEventBody = {
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

  it('inserts a published event organized by the given user', async () => {
    const { service, repository } = setup();

    await service.create(organizerId, body);

    expect(repository.insert).toHaveBeenCalledWith({
      title: 'Concert de jazz',
      description: 'Une soirée jazz avec le quartet de Lyon.',
      startsAt: new Date('2026-12-05T19:30:00Z'),
      endsAt: new Date('2026-12-05T22:00:00Z'),
      locationName: 'Salle Molière',
      locationAddress: '18 quai de Bondy',
      city: 'Lyon',
      imageUrl: 'https://exemple.fr/jazz.jpg',
      type: 'concert',
      status: 'published',
      organizerId,
    });
  });

  it.each([
    ['absent', {}],
    ['null', { endsAt: null, imageUrl: null }],
  ])(
    'stores a null endsAt and imageUrl when they are %s',
    async (_, fields) => {
      const { service, repository } = setup();
      const { endsAt: _endsAt, imageUrl: _imageUrl, ...minimal } = body;

      await service.create(organizerId, { ...minimal, ...fields });

      expect(repository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ endsAt: null, imageUrl: null }),
      );
    },
  );

  it('returns the created event with its organizer', async () => {
    const { service } = setup();

    await expect(service.create(organizerId, body)).resolves.toBe(detail);
  });

  it('throws 500 INTERNAL_ERROR when the event cannot be read back', async () => {
    const { service, repository } = setup();
    repository.insert.mockResolvedValue(null);

    await expect(service.create(organizerId, body)).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
    });
  });
});

describe('EventsService.hasUpcomingPublishedEvents', () => {
  const organizerId = 'a1b2c3d4-0000-4000-8000-000000000001';

  it('is false when the organizer has no upcoming published event', async () => {
    const { service, repository } = setup();

    await expect(service.hasUpcomingPublishedEvents(organizerId)).resolves.toBe(
      false,
    );
    expect(repository.countUpcomingPublished).toHaveBeenCalledWith(organizerId);
  });

  it('is true as soon as one upcoming published event exists', async () => {
    const { service, repository } = setup();
    repository.countUpcomingPublished.mockResolvedValue(1);

    await expect(service.hasUpcomingPublishedEvents(organizerId)).resolves.toBe(
      true,
    );
  });
});
