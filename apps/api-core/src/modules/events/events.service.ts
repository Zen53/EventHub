import type { ListEventsQuery, PaginationMeta } from '@eventhub/schemas';
import { Injectable } from '@nestjs/common';
import { AppError } from '../../core/errors/app-error.js';
import { EventsRepository } from './events.repository.js';
import type { EventDetailRow, EventSummaryRow } from './events.schema.js';

export interface UpcomingEvents {
  rows: EventSummaryRow[];
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

  async getById(id: string): Promise<EventDetailRow> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new AppError('EVENT_NOT_FOUND');
    }
    return row;
  }
}
