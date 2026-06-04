import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/govwatch';

const globalForDb = globalThis as unknown as { _pg?: ReturnType<typeof postgres> };

const client =
  globalForDb._pg ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== 'production') globalForDb._pg = client;

export const db = drizzle(client, { schema });
export { schema };
export type Db = typeof db;
