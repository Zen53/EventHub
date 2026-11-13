import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { Env } from '../config/env.schema.js';
import * as schema from './schema.js';

// DrizzleModule makes the database injectable everywhere and closes its client on application shutdown.
@Global()
@Module({
  imports: [
    DrizzleModule.forRootAsync<typeof drizzle>({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        drizzle,
        connection: config.get('DATABASE_URL', { infer: true }),
        schema,
      }),
    }),
  ],
})
export class DatabaseModule {}
