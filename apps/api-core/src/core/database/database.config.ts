import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const databaseEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

export interface DatabaseConfig {
  url: string;
}

export function parseDatabaseConfig(
  env: Record<string, unknown>,
): DatabaseConfig {
  const result = databaseEnvSchema.safeParse(env);
  if (!result.success) {
    // Lists the failing keys only, never their values: DATABASE_URL holds a password.
    throw new Error(
      `Invalid database configuration: ${z.prettifyError(result.error)}`,
    );
  }
  return { url: result.data.DATABASE_URL };
}

export const databaseConfig = registerAs('database', () =>
  parseDatabaseConfig(process.env),
);
