import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;
const isTursoRemote = url.startsWith('libsql:') || url.startsWith('https:');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: isTursoRemote ? 'turso' : 'sqlite',
  dbCredentials: isTursoRemote
    ? {
        url,
        authToken: authToken || '',
      }
    : {
        url,
      },
});
