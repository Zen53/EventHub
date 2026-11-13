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
  // Validated only when a command reads it (migrate, push, studio), so `generate` needs no database.
  dbCredentials: {
    get url() {
      return parseDatabaseConfig(process.env).url;
    },
  },
});
