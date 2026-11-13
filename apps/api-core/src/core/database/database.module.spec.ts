import { Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/postgres-js';
import { envSchema } from '../config/env.schema.js';
import { type Database, InjectDatabase } from './database.js';
import { DatabaseModule } from './database.module.js';

const { end, fakeDb } = vi.hoisted(() => {
  const end = vi.fn().mockResolvedValue(undefined);
  return { end, fakeDb: { $client: { end } } };
});

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => fakeDb),
}));

// Same ConfigModule setup as CoreModule, without reading a .env file.
const configModule = () =>
  ConfigModule.forRoot({
    isGlobal: true,
    ignoreEnvFile: true,
    validationSchema: envSchema,
  });

@Injectable()
class Consumer {
  constructor(@InjectDatabase() readonly db: Database) {}
}

describe('DatabaseModule', () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.stubEnv('JWT_ACCESS_SECRET', 'test-only-access-secret-of-32-chars!');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  });

  it('creates the client from DATABASE_URL, injects it, and closes it on shutdown', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

    const moduleRef = await Test.createTestingModule({
      imports: [configModule(), DatabaseModule],
      providers: [Consumer],
    }).compile();

    expect(drizzle).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: 'postgres://user:pass@localhost:5432/db',
      }),
    );
    expect(moduleRef.get(Consumer).db).toBe(fakeDb);

    await moduleRef.close();
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('fails to start when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    await expect(
      Test.createTestingModule({
        imports: [configModule(), DatabaseModule],
      }).compile(),
    ).rejects.toThrow(/DATABASE_URL/);
    expect(drizzle).not.toHaveBeenCalled();
  });
});
