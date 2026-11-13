import { Global, Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import { databaseConfig } from './database.config.js';
import * as schema from './schema.js';

// DrizzleModule makes the database injectable everywhere and closes its client on application shutdown.
@Global()
@Module({
  imports: [
    DrizzleModule.forRootAsync({
      imports: [ConfigModule.forFeature(databaseConfig)],
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) => ({
        drizzle,
        connection: config.url,
        schema,
      }),
    }),
  ],
})
export class DatabaseModule {}
