import {
  eventsListResponseSchema,
  type ListEventsQuery,
  listEventsQuerySchema,
} from '@eventhub/schemas';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../core/openapi/api-endpoint.js';
import { Public } from '../../core/security/index.js';
import { toEventSummary } from './event.dto.js';
import { EventsService } from './events.service.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Public()
  @ApiEndpoint('Lister les événements', {
    response: eventsListResponseSchema,
    errors: ['VALIDATION_ERROR'],
  })
  @Get()
  async list(@Query({ schema: listEventsQuerySchema }) query: ListEventsQuery) {
    const { rows, meta } = await this.events.listUpcoming(query);
    return { data: rows.map(toEventSummary), meta };
  }
}
