import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** HS256 secret of the access tokens. The `.env.example` placeholder is refused. */
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .refine((secret) => !secret.startsWith('change-me'), {
      message: 'Replace the placeholder with a random secret',
    }),
});

export type Env = z.infer<typeof envSchema>;
