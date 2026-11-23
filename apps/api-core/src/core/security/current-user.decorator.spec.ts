import type { ExecutionContext } from '@nestjs/common';
import { currentUserFactory } from './current-user.decorator.js';

const contextWith = (user?: { userId: string }) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('@CurrentUser()', () => {
  it('returns the identity attached by the guard', () => {
    expect(
      currentUserFactory(undefined, contextWith({ userId: 'user-1' })),
    ).toEqual({
      userId: 'user-1',
    });
  });

  it('throws when no identity is attached (misuse on a @Public() route)', () => {
    expect(() => currentUserFactory(undefined, contextWith())).toThrow(
      /@CurrentUser/,
    );
  });
});
