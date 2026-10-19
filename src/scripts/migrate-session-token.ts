import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkAndAddColumn(label: string, client: ReturnType<typeof createClient>) {
  console.log(`Checking meetings table in ${label}...`);
  try {
    const info = await client.execute('PRAGMA table_info(meetings)');
    const colNames = info.rows.map((r: any) => String(r.name));
    console.log(`Current columns in ${label}:`, colNames);

    if (!colNames.includes('session_token')) {
      console.log(`Adding 'session_token' column to ${label}...`);
      await client.execute('ALTER TABLE meetings ADD COLUMN session_token TEXT');
      console.log(`Column 'session_token' added to ${label}.`);
    } else {
      console.log(`Column 'session_token' already exists in ${label}.`);
    }

    if (!colNames.includes('attendance_token')) {
      console.log(`Adding 'attendance_token' column to ${label}...`);
      await client.execute('ALTER TABLE meetings ADD COLUMN attendance_token TEXT');
      console.log(`Column 'attendance_token' added to ${label}.`);
    } else {
      console.log(`Column 'attendance_token' already exists in ${label}.`);
    }
  } catch (err: any) {
    console.error(`Error with ${label}:`, err.message);
  }
}

async function main() {
  const localClient = createClient({ url: 'file:local.db' });
  await checkAndAddColumn('local.db', localClient);

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    const tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });
    await checkAndAddColumn('Turso Cloud', tursoClient);
  }
  console.log('Migration script complete.');
}

main().catch(console.error);
