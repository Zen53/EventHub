import { Injectable } from '@nestjs/common';
import { asc, eq, gt, sql } from 'drizzle-orm';
import { type Database, InjectDatabase } from '../../core/database/index.js';
import { users } from '../users/users.schema.js';
import {
  type EventDetailRow,
  type EventSummaryRow,
  events,
  type NewEventRow,
} from './events.schema.js';

export interface EventsPage {
  rows: EventSummaryRow[];
  total: number;
}

const summaryColumns = {
  id: events.id,
  title: events.title,
  startsAt: events.startsAt,
  city: events.city,
  imageUrl: events.imageUrl,
  type: events.type,
  status: events.status,
};

const organizerColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
};

const detailColumns = {
  id: events.id,
  title: events.title,
  description: events.description,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
  locationName: events.locationName,
  locationAddress: events.locationAddress,
  city: events.city,
  imageUrl: events.imageUrl,
  type: events.type,
  status: events.status,
  createdAt: events.createdAt,
  updatedAt: events.updatedAt,
  organizer: organizerColumns,
};

@Injectable()
export class EventsRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async findUpcoming(limit: number, offset: number): Promise<EventsPage> {
    const upcoming = gt(events.startsAt, sql`now()`);
    const [rows, total] = await Promise.all([
      this.db
        .select(summaryColumns)
        .from(events)
        .where(upcoming)
        .orderBy(asc(events.startsAt), asc(events.id))
        .limit(limit)
        .offset(offset),
      this.db.$count(events, upcoming),
    ]);
    return { rows, total };
  }

  async findById(id: string): Promise<EventDetailRow | null> {
    const [row] = await this.db
      .select(detailColumns)
      .from(events)
      .innerJoin(users, eq(events.organizerId, users.id))
      .where(eq(events.id, id))
      .limit(1);
    return row ?? null;
  }

  async insert(values: NewEventRow): Promise<EventDetailRow | null> {
    const [inserted] = await this.db
      .insert(events)
      .values(values)
      .returning({ id: events.id });
    return inserted ? this.findById(inserted.id) : null;
  }
}
