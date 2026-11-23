import type { ListEventsQuery, PaginationMeta } from '@eventhub/schemas';
import { Injectable } from '@nestjs/common';
import { EventsRepository } from './events.repository.js';
import type { EventRow } from './events.schema.js';

export interface UpcomingEvents {
  rows: EventRow[];
  meta: PaginationMeta;
}

@Injectable()
export class EventsService {
  constructor(private readonly repository: EventsRepository) {}

  async listUpcoming({
    page,
    limit,
  }: ListEventsQuery): Promise<UpcomingEvents> {
    const { rows, total } = await this.repository.findUpcoming(
      limit,
      (page - 1) * limit,
    );
    return { rows, meta: { page, limit, total } };
  }
}
