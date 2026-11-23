import type { EventsRepository } from './events.repository.js';
import type { EventRow } from './events.schema.js';
import { EventsService } from './events.service.js';

const row = { id: '3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90' } as EventRow;

function setup(total = 42) {
  const repository = {
    findUpcoming: vi.fn().mockResolvedValue({ rows: [row], total }),
  };
  const service = new EventsService(repository as unknown as EventsRepository);
  return { service, repository };
}

describe('EventsService.listUpcoming', () => {
  it('reads the first page from offset 0', async () => {
    const { service, repository } = setup();

    await service.listUpcoming({ page: 1, limit: 20 });

    expect(repository.findUpcoming).toHaveBeenCalledWith(20, 0);
  });

  it('skips the previous pages', async () => {
    const { service, repository } = setup();

    await service.listUpcoming({ page: 3, limit: 10 });

    expect(repository.findUpcoming).toHaveBeenCalledWith(10, 20);
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
