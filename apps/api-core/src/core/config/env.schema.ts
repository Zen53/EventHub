import { z } from 'zod';

export const DEVELOPMENT_WEB_URL = 'http://localhost:3000';

export const envVariablesSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .refine((secret) => !secret.startsWith('change-me'), {
      message: 'Replace the placeholder with a random secret',
    }),
  SMTP_URL: z.url({ protocol: /^smtps?$/ }),
  SMTP_STARTTLS: z.enum(['required', 'opportunistic', 'never']).optional(),
  MAIL_FROM: z.string().trim().min(1),
  WEB_URL: z.url({ protocol: /^https?$/ }).optional(),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
});

export const envSchema = envVariablesSchema.transform((env, context) => {
  if (env.WEB_URL !== undefined) {
    return { ...env, WEB_URL: env.WEB_URL };
  }
  if (env.NODE_ENV === 'development') {
    return { ...env, WEB_URL: DEVELOPMENT_WEB_URL };
  }
  context.addIssue({
    code: 'custom',
    path: ['WEB_URL'],
    message: 'Required when NODE_ENV is not development',
  });
  return z.NEVER;
});

export type Env = z.infer<typeof envSchema>;
