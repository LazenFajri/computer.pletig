import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import path from 'path';

// LibSQL Client initialization
// Mendukung Turso Cloud remote (libsql://...) maupun SQLite lokal (file:local.db)
// Path absolut digunakan agar worker Next.js saat build / server selalu mengarah ke database yang sama
const defaultLocalDb = `file:${path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/')}`;
const url = process.env.TURSO_DATABASE_URL || defaultLocalDb;
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken: authToken && authToken.trim().length > 0 ? authToken : undefined,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
