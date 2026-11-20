import { describe, expect, it } from 'vitest';
import { errorCatalog, errorCodes, errorCodeSchema } from './error-catalog.js';
import { errorResponseSchema } from './errors.js';

const bodyWith = (code: string) => ({
  error: { code, message: 'Some message', details: null },
});

describe('errorCatalog', () => {
  it.each(Object.entries(errorCatalog))(
    '%s has an error status and a message',
    (_code, { status, message }) => {
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
      expect(message.trim()).not.toBe('');
    },
  );

  it('lists every key of the catalog in errorCodes', () => {
    expect(errorCodes).toEqual(Object.keys(errorCatalog));
  });

  it('rejects a code outside the catalog in errorCodeSchema', () => {
    expect(errorCodeSchema.safeParse('EMAIL_TAKEN').success).toBe(false);
  });
});

describe('errorResponseSchema', () => {
  it.each(errorCodes)('accepts the code %s', (code) => {
    expect(errorResponseSchema.parse(bodyWith(code))).toEqual(bodyWith(code));
  });

  it('rejects an unknown code', () => {
    expect(errorResponseSchema.safeParse(bodyWith('HTTP_ERROR')).success).toBe(
      false,
    );
  });

  it('accepts field details', () => {
    const body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ field: 'email', message: 'Invalid email' }],
      },
    };

    expect(errorResponseSchema.parse(body)).toEqual(body);
  });
});
