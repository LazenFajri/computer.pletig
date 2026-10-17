import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function migrateDatabase(label: string, client: ReturnType<typeof createClient>) {
  console.log(`\n========================================`);
  console.log(`Checking Database: ${label}`);
  console.log(`========================================`);

  try {
    const tableInfo = await client.execute('PRAGMA table_info(assignments)');
    const colNames = tableInfo.rows.map((r: any) => r.name);
    console.log(`Assignments columns in ${label}:`, colNames);

    if (!colNames.includes('attachment_url')) {
      console.log(`⚠️ Column 'attachment_url' is MISSING in ${label}! Adding column...`);
      await client.execute('ALTER TABLE assignments ADD COLUMN attachment_url TEXT');
      console.log(`✅ Column 'attachment_url' successfully added to ${label}!`);
    } else {
      console.log(`✅ Column 'attachment_url' already exists in ${label}.`);
    }

    // Verify after migration
    const verifyInfo = await client.execute('PRAGMA table_info(assignments)');
    console.log(`Verified columns in ${label}:`, verifyInfo.rows.map((r: any) => r.name));
  } catch (err: any) {
    console.error(`❌ Error migrating ${label}:`, err.message);
  }
}

async function main() {
  // 1. Check local.db
  const localClient = createClient({ url: 'file:local.db' });
  await migrateDatabase('local.db (Local SQLite)', localClient);

  // 2. Check Turso Cloud
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    const tursoClient = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
    await migrateDatabase('Turso Cloud Remote', tursoClient);
  } else {
    console.log('Turso env vars not found.');
  }

  console.log('\nMigration check complete!');
}

main().catch(console.error);
