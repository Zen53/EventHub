import { errorCatalog, errorCodes } from '@eventhub/schemas';
import { AppError } from './app-error.js';

describe('AppError', () => {
  it.each(errorCodes)(
    'takes the status and message of %s from the catalog',
    (code) => {
      expect(new AppError(code)).toMatchObject({
        code,
        status: errorCatalog[code].status,
        message: errorCatalog[code].message,
        details: null,
      });
    },
  );

  it('keeps the given details', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];

    expect(new AppError('VALIDATION_ERROR', details).details).toBe(details);
  });
});
