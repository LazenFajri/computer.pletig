import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

// LibSQL Client initialization
// Mendukung Turso remote (libsql://...) maupun SQLite lokal (file:local.db)

export const client = createClient({
  url,
  authToken: authToken && authToken.trim().length > 0 ? authToken : undefined,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
