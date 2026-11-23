import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { Database } from '../../core/database/index.js';
import { users } from '../users/users.schema.js';
import { EventsRepository } from './events.repository.js';
import {
  type EventDetailRow,
  type EventSummaryRow,
  events,
} from './events.schema.js';

const dialect = new PgDialect();
const render = (condition: SQL) => dialect.sqlToQuery(condition).sql;

const row = { id: '3f2a9c1e-7b4d-4e8a-9f10-2c5d6e7f8a90' } as EventSummaryRow;
const detail = { id: row.id } as EventDetailRow;

function setup() {
  const selectQuery = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn().mockResolvedValue([row]),
  };
  selectQuery.from.mockReturnValue(selectQuery);
  selectQuery.innerJoin.mockReturnValue(selectQuery);
  selectQuery.where.mockReturnValue(selectQuery);
  selectQuery.orderBy.mockReturnValue(selectQuery);
  selectQuery.limit.mockReturnValue(selectQuery);
  const db = {
    select: vi.fn((_columns?: Record<string, unknown>) => selectQuery),
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

  it('selects only the columns of the summary', async () => {
    const { repository, db } = setup();

    await repository.findUpcoming(20, 0);

    expect(db.select.mock.calls[0]?.[0]).toEqual({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      city: events.city,
      imageUrl: events.imageUrl,
      type: events.type,
      status: events.status,
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

describe('EventsRepository.findById', () => {
  function setupById(rows: unknown[]) {
    const context = setup();
    context.selectQuery.limit.mockResolvedValue(rows);
    return context;
  }

  it('returns the event with its organizer', async () => {
    const { repository } = setupById([detail]);

    await expect(repository.findById(row.id)).resolves.toBe(detail);
  });

  it('returns null when no event has this id', async () => {
    const { repository } = setupById([]);

    await expect(repository.findById(row.id)).resolves.toBeNull();
  });

  it('reads one event by id, joined to its organizer', async () => {
    const { repository, selectQuery } = setupById([detail]);

    await repository.findById(row.id);

    expect(selectQuery.from).toHaveBeenCalledWith(events);
    const [table, join] = selectQuery.innerJoin.mock.calls[0] as [unknown, SQL];
    expect(table).toBe(users);
    expect(render(join)).toBe('"events"."organizer_id" = "users"."id"');
    const where = selectQuery.where.mock.calls[0]?.[0] as SQL;
    expect(render(where)).toBe('"events"."id" = $1');
    expect(selectQuery.limit).toHaveBeenCalledWith(1);
  });

  it('selects the public fields of the organizer only', async () => {
    const { repository, db } = setupById([detail]);

    await repository.findById(row.id);

    const columns = db.select.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(columns.organizer).toEqual({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    });
    expect(columns).not.toHaveProperty('organizerId');
  });
});
