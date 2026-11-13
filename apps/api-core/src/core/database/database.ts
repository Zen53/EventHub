import { InjectDrizzle } from '@nestjs/drizzle';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;

export const InjectDatabase = (): PropertyDecorator & ParameterDecorator =>
  InjectDrizzle();
