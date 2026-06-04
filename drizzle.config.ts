import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Use direct (non-pooled) URL for migrations; pooled URL doesn't support DDL well.
    // Supabase free tier: direct (5432) is IPv6-only, pooled (6543) is IPv4.
    // Use pooled URL for migrations — DDL works through the transaction pooler.
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/govwatch',
  },
  strict: true,
  verbose: true,
});
