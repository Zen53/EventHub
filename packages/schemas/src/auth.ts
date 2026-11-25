import { z } from 'zod';
import { strictBodyError } from './body.js';
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
  userSchema,
} from './user.js';

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

export const forgotPasswordBodySchema = z.strictObject(
  { email: emailSchema },
  { error: strictBodyError },
);

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.strictObject(
  {
    token: z
      .string({ error: 'Le jeton est obligatoire.' })
      .min(1, 'Le jeton est obligatoire.')
      .max(512, 'Le jeton doit contenir au plus 512 caractères.'),
    newPassword: passwordSchema,
  },
  { error: strictBodyError },
);

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
});

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;
