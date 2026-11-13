import { z } from 'zod';

/** Email sent by the client: valid format, 254 characters at most, stored in lowercase. */
export const emailSchema = z
  .string({ error: "L'email est obligatoire." })
  .trim()
  .max(254, "L'email doit contenir au plus 254 caractères.")
  .toLowerCase()
  .pipe(z.email({ error: "L'email n'est pas valide." }));

/** First or last name: 1 to 50 characters. */
export const nameSchema = z
  .string({ error: 'Ce champ est obligatoire.' })
  .trim()
  .min(1, 'Ce champ doit contenir au moins 1 caractère.')
  .max(50, 'Ce champ doit contenir au plus 50 caractères.');

/** Phone number in the international E.164 format, e.g. "+33612345678". */
export const phoneSchema = z
  .string({ error: 'Le téléphone doit être une chaîne.' })
  .regex(
    /^\+[1-9]\d{1,14}$/,
    'Le téléphone doit être au format international, par exemple +33612345678.',
  );

/** Password rules of the contract: 8 to 72 characters, at least one letter and one digit. */
export const passwordSchema = z
  .string({ error: 'Le mot de passe est obligatoire.' })
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(72, 'Le mot de passe doit contenir au plus 72 caractères.')
  .regex(/\p{L}/u, 'Le mot de passe doit contenir au moins une lettre.')
  .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre.');

/** `User` returned by the API: see docs/contrat-user.md. Never contains the password. */
export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;
