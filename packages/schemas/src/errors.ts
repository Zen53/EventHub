import { z } from 'zod';

/** One invalid field of a `VALIDATION_ERROR`; `field` is the path joined by dots. */
export const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;

/** Body of every API error: see "Format des erreurs" in docs/contrat-user.md. */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(fieldErrorSchema).nullable(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
