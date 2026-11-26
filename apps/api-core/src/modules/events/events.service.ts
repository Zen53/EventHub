import type {
  CreateEventBody,
  ListEventsQuery,
  PaginationMeta,
} from '@eventhub/schemas';
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
    user_id: organizerId,
  }: ListEventsQuery): Promise<UpcomingEvents> {
    const { rows, total } = await this.repository.findUpcoming(
      limit,
      (page - 1) * limit,
      organizerId,
    );
    return { rows, meta: { page, limit, total } };
  }

  /** Vrai si l'utilisateur organise des événements publiés à venir : il ne peut pas supprimer son compte. */
  async hasUpcomingPublishedEvents(organizerId: string): Promise<boolean> {
    return (await this.repository.countUpcomingPublished(organizerId)) > 0;
  }

  async getById(id: string): Promise<EventDetailRow> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new AppError('EVENT_NOT_FOUND');
    }
    return row;
  }

  async create(
    organizerId: string,
    body: CreateEventBody,
  ): Promise<EventDetailRow> {
    const row = await this.repository.insert({
      title: body.title,
      description: body.description,
      startsAt: new Date(body.startsAt),
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      locationName: body.location.name,
      locationAddress: body.location.address,
      city: body.location.city,
      imageUrl: body.imageUrl ?? null,
      type: body.type,
      status: 'published',
      organizerId,
    });
    if (!row) {
      throw new AppError('INTERNAL_ERROR');
    }
    return row;
  }
}
