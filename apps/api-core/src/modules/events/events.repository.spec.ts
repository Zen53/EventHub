import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { Database } from '../../core/database/index.js';
import { EventsRepository } from './events.repository.js';
import { type EventRow, events } from './events.schema.js';

const dialect = new PgDialect();
const render = (condition: SQL) => dialect.sqlToQuery(condition).sql;

const row = { id: '3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90' } as EventRow;

function setup() {
  const selectQuery = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn().mockResolvedValue([row]),
  };
  selectQuery.from.mockReturnValue(selectQuery);
  selectQuery.where.mockReturnValue(selectQuery);
  selectQuery.orderBy.mockReturnValue(selectQuery);
  selectQuery.limit.mockReturnValue(selectQuery);
  const db = {
    select: vi.fn(() => selectQuery),
    $count: vi.fn().mockResolvedValue(7),
  };
  const repository = new EventsRepository(db as unknown as Database);
  return { repository, db, selectQuery };
}

describe('EventsRepository.findUpcoming', () => {
  it('returns the page of rows and the total of upcoming events', async () => {
    const { repository } = setup();

    await expect(repository.findUpcoming(20, 40)).resolves.toEqual({
      rows: [row],
      total: 7,
    });
  });

  it('keeps only the events that start after now, for the rows and the total', async () => {
    const { repository, db, selectQuery } = setup();

    await repository.findUpcoming(20, 0);

    const condition = selectQuery.where.mock.calls[0]?.[0] as SQL;
    expect(render(condition)).toBe('"events"."starts_at" > now()');
    expect(db.$count).toHaveBeenCalledWith(events, condition);
  });

  it('sorts by start date, then by id, and applies the limit and the offset', async () => {
    const { repository, selectQuery } = setup();

    await repository.findUpcoming(10, 30);

    expect(selectQuery.from).toHaveBeenCalledWith(events);
    const order = (selectQuery.orderBy.mock.calls[0] as SQL[]).map(render);
    expect(order).toEqual(['"events"."starts_at" asc', '"events"."id" asc']);
    expect(selectQuery.limit).toHaveBeenCalledWith(10);
    expect(selectQuery.offset).toHaveBeenCalledWith(30);
  });
});
