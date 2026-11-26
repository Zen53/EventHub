import { AppError } from '../../core/errors/app-error.js';
import type { EventsService } from '../events/index.js';
import type { UsersService } from '../users/index.js';
import { AccountService } from './account.service.js';

const USER_ID = 'a1b2c3d4-0000-4000-8000-000000000002';
const body = { password: 'motdepasse123' };

function setup() {
  const users = {
    verifyPassword: vi.fn().mockResolvedValue(undefined),
    anonymize: vi.fn().mockResolvedValue(undefined),
  };
  const events = {
    hasUpcomingPublishedEvents: vi.fn().mockResolvedValue(false),
  };
  const service = new AccountService(
    users as unknown as UsersService,
    events as unknown as EventsService,
  );
  return { service, users, events };
}

describe('AccountService.deleteAccount', () => {
  it('checks the password, then the upcoming events, then anonymizes the account', async () => {
    const { service, users, events } = setup();

    await expect(service.deleteAccount(USER_ID, body)).resolves.toBeUndefined();

    expect(users.verifyPassword).toHaveBeenCalledWith(USER_ID, 'motdepasse123');
    expect(events.hasUpcomingPublishedEvents).toHaveBeenCalledWith(USER_ID);
    expect(users.anonymize).toHaveBeenCalledWith(USER_ID);
    const [verifyOrder] = users.verifyPassword.mock.invocationCallOrder;
    const [eventsOrder] =
      events.hasUpcomingPublishedEvents.mock.invocationCallOrder;
    const [anonymizeOrder] = users.anonymize.mock.invocationCallOrder;
    expect(verifyOrder).toBeLessThan(eventsOrder);
    expect(eventsOrder).toBeLessThan(anonymizeOrder);
  });

  it('propagates 403 WRONG_PASSWORD without looking at the events nor deleting', async () => {
    const { service, users, events } = setup();
    const error = new AppError('WRONG_PASSWORD');
    users.verifyPassword.mockRejectedValue(error);

    await expect(service.deleteAccount(USER_ID, body)).rejects.toBe(error);
    expect(events.hasUpcomingPublishedEvents).not.toHaveBeenCalled();
    expect(users.anonymize).not.toHaveBeenCalled();
  });

  it('throws 409 ACCOUNT_HAS_UPCOMING_EVENTS and keeps the account while upcoming events exist', async () => {
    const { service, users, events } = setup();
    events.hasUpcomingPublishedEvents.mockResolvedValue(true);

    const promise = service.deleteAccount(USER_ID, body);

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 409,
      code: 'ACCOUNT_HAS_UPCOMING_EVENTS',
    });
    expect(users.anonymize).not.toHaveBeenCalled();
  });

  it('propagates 401 UNAUTHORIZED when the account disappears before the anonymization', async () => {
    const { service, users } = setup();
    const error = new AppError('UNAUTHORIZED');
    users.anonymize.mockRejectedValue(error);

    await expect(service.deleteAccount(USER_ID, body)).rejects.toBe(error);
  });
});
