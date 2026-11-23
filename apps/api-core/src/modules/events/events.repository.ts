import { Injectable } from '@nestjs/common';
import { asc, gt, sql } from 'drizzle-orm';
import { type Database, InjectDatabase } from '../../core/database/index.js';
import { type EventRow, events } from './events.schema.js';

export interface EventsPage {
  rows: EventRow[];
  total: number;
}

@Injectable()
export class EventsRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async findUpcoming(limit: number, offset: number): Promise<EventsPage> {
    const upcoming = gt(events.startsAt, sql`now()`);
    const [rows, total] = await Promise.all([
      this.db
        .select()
        .from(events)
        .where(upcoming)
        .orderBy(asc(events.startsAt), asc(events.id))
        .limit(limit)
        .offset(offset),
      this.db.$count(events, upcoming),
    ]);
    return { rows, total };
  }
}
