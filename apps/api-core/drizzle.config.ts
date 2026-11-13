import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';
import { parseDatabaseConfig } from './src/core/database/database.config.js';

// drizzle-kit runs outside Nest, so it loads .env itself (variables already set in the shell win).
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/**/*.schema.ts',
  out: './drizzle',
  dbCredentials: { url: parseDatabaseConfig(process.env).url },
});
