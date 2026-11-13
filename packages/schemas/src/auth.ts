import { z } from 'zod';
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
  userSchema,
} from './user.js';

const strictBodyError = (issue: { code: string; keys?: string[] }) =>
  issue.code === 'unrecognized_keys'
    ? `Champ inconnu : ${(issue.keys ?? []).join(', ')}.`
    : 'Le corps de la requête doit être un objet JSON.';

export const registerBodySchema = z.strictObject(
  {
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema.nullable().optional(),
  },
  { error: strictBodyError },
);

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.strictObject(
  {
    email: emailSchema,
    password: z
      .string({ error: 'Le mot de passe est obligatoire.' })
      .min(1, 'Le mot de passe est obligatoire.')
      .max(72, 'Le mot de passe doit contenir au plus 72 caractères.'),
  },
  { error: strictBodyError },
);

export type LoginBody = z.infer<typeof loginBodySchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
