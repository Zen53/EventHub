import { z } from 'zod';
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
} from './user.js';

export const registerBodySchema = z.strictObject(
  {
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema.nullable().optional(),
  },
  {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? `Champ inconnu : ${issue.keys.join(', ')}.`
        : 'Le corps de la requête doit être un objet JSON.',
  },
);

export type RegisterBody = z.infer<typeof registerBodySchema>;
