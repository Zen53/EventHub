import {
  type CreateEventBody,
  createEventBodySchema,
  createEventResponseSchema,
  type EventIdParams,
  eventIdParamsSchema,
  eventSchema,
  eventsListResponseSchema,
  type ListEventsQuery,
  listEventsQuerySchema,
} from '@eventhub/schemas';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../core/openapi/api-endpoint.js';
import {
  type AuthenticatedUser,
  CurrentUser,
  Public,
} from '../../core/security/index.js';
import { toEvent, toEventSummary } from './event.dto.js';
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

  @Public()
  @ApiEndpoint('Consulter un événement', {
    response: eventSchema,
    errors: ['VALIDATION_ERROR', 'EVENT_NOT_FOUND'],
  })
  @Get(':id')
  async getById(@Param({ schema: eventIdParamsSchema }) { id }: EventIdParams) {
    return toEvent(await this.events.getById(id));
  }

  @ApiEndpoint('Créer un événement', {
    description:
      'L’organisateur est l’utilisateur connecté. L’événement est publié dès sa création. La date de début doit être dans le futur et la date de fin, si elle est donnée, après la date de début.',
    response: createEventResponseSchema,
    errors: ['VALIDATION_ERROR'],
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() { userId }: AuthenticatedUser,
    @Body({ schema: createEventBodySchema }) body: CreateEventBody,
  ) {
    return toEvent(await this.events.create(userId, body));
  }
}
