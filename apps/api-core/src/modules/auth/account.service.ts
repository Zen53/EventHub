import type { DeleteMeBody } from '@eventhub/schemas';
import { Injectable } from '@nestjs/common';
import { AppError } from '../../core/errors/app-error.js';
import { EventsService } from '../events/index.js';
import { UsersService } from '../users/index.js';

@Injectable()
export class AccountService {
  constructor(
    private readonly users: UsersService,
    private readonly events: EventsService,
  ) {}

  /**
   * Supprime le compte (EV-82, EV-83) : mot de passe vérifié d'abord, pour ne
   * rien révéler sans lui ; refus tant que l'utilisateur organise des
   * événements publiés à venir ; puis anonymisation, qui invalide aussi
   * toutes ses sessions.
   */
  async deleteAccount(
    userId: string,
    { password }: DeleteMeBody,
  ): Promise<void> {
    await this.users.verifyPassword(userId, password);
    if (await this.events.hasUpcomingPublishedEvents(userId)) {
      throw new AppError('ACCOUNT_HAS_UPCOMING_EVENTS');
    }
    await this.users.anonymize(userId);
  }
}
