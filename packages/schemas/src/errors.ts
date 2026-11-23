import { z } from 'zod';
import { errorCodeSchema } from './error-catalog.js';

export const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(fieldErrorSchema).nullable(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
