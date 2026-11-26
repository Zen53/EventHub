import { InjectDrizzle } from '@nestjs/drizzle';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;

export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export const InjectDatabase = (): PropertyDecorator & ParameterDecorator =>
  InjectDrizzle();
