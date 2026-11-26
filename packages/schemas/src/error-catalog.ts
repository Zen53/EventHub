import { z } from 'zod';

export const errorCatalog = {
  VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
  BAD_REQUEST: { status: 400, message: 'Bad request' },
  INVALID_RESET_TOKEN: {
    status: 400,
    message: 'Invalid, expired or already used reset token',
  },
  UNAUTHORIZED: { status: 401, message: 'Authentication required' },
  INVALID_CREDENTIALS: { status: 401, message: 'Invalid email or password' },
  INVALID_REFRESH_TOKEN: {
    status: 401,
    message: 'Invalid or expired refresh token',
  },
  FORBIDDEN: { status: 403, message: 'Forbidden' },
  WRONG_PASSWORD: { status: 403, message: 'Wrong current password' },
  NOT_FOUND: { status: 404, message: 'Not found' },
  EVENT_NOT_FOUND: { status: 404, message: 'Event not found' },
  EMAIL_ALREADY_USED: { status: 409, message: 'Email already used' },
  ACCOUNT_HAS_UPCOMING_EVENTS: {
    status: 409,
    message: 'Account organizes upcoming events',
  },
  TOO_MANY_REQUESTS: { status: 429, message: 'Too many requests' },
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof errorCatalog;

export const errorCodes = Object.keys(errorCatalog) as [
  ErrorCode,
  ...ErrorCode[],
];

export const errorCodeSchema = z.enum(errorCodes);
