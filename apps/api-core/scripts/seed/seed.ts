import { existsSync } from 'node:fs';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { envVariablesSchema } from '../../src/core/config/env.schema.js';
import { events } from '../../src/modules/events/events.schema.js';
import { PasswordHasher } from '../../src/modules/users/password-hasher.js';
import { users } from '../../src/modules/users/users.schema.js';
import {
  buildDemoEvents,
  DEMO_ORGANIZER_PASSWORD,
  demoOrganizer,
} from './demo-data.js';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const { DATABASE_URL } = envVariablesSchema
  .pick({ DATABASE_URL: true })
  .parse(process.env);

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle({ client });

async function seed(): Promise<void> {
  const passwordHash = await new PasswordHasher().hash(DEMO_ORGANIZER_PASSWORD);

  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values({ ...demoOrganizer, passwordHash })
      .onConflictDoNothing();

    const [organizer] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, demoOrganizer.email));

    const seeded = await tx
      .insert(events)
      .values(buildDemoEvents(new Date(), organizer.id))
      .onConflictDoUpdate({
        target: events.id,
        set: {
          startsAt: sql`excluded.starts_at`,
          description: sql`excluded.description`,
          locationName: sql`excluded.location_name`,
          locationAddress: sql`excluded.location_address`,
        },
      })
      .returning({ id: events.id });

    console.log(
      `Seed: organizer ${demoOrganizer.email}, ${seeded.length} event(s) dated from now.`,
    );
  });
}

try {
  await seed();
} catch (error) {
  console.error('Seed failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
