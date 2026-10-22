import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { createClient } from '@libsql/client';

async function migrate() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  console.log('Connecting to Turso Cloud:', tursoUrl);

  if (!tursoUrl || !tursoToken) {
    throw new Error('TURSO_DATABASE_URL or TURSO_AUTH_TOKEN missing in .env.local');
  }

  const client = createClient({ url: tursoUrl, authToken: tursoToken });

  // 1. Check and add gdrive_url to assignments
  const info = await client.execute('PRAGMA table_info(assignments)');
  const cols = info.rows.map((r: any) => String(r.name));

  if (!cols.includes('gdrive_url')) {
    console.log('Adding gdrive_url to Turso Cloud assignments table...');
    await client.execute('ALTER TABLE assignments ADD COLUMN gdrive_url TEXT');
    console.log('✅ Column gdrive_url added to Turso Cloud assignments table!');
  } else {
    console.log('✅ Column gdrive_url already exists in Turso Cloud.');
  }

  // 2. Ensure uploaded_files table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  console.log('✅ Table uploaded_files verified in Turso Cloud!');

  // 3. Update existing assignments without gdrive_url to the default user folder
  const defaultGdrive = 'https://drive.google.com/drive/folders/1sgR-9GFibFvMxeGLKfrqVFh8SAVcI9dO?usp=drive_link';
  const updateRes = await client.execute({
    sql: "UPDATE assignments SET gdrive_url = ? WHERE gdrive_url IS NULL OR gdrive_url = ''",
    args: [defaultGdrive],
  });
  console.log('✅ Updated existing assignments with default gdrive_url:', updateRes.rowsAffected);

  // 4. Verify all tables
  const tables = ['users', 'sessions', 'device_stations', 'meetings', 'attendance', 'materials', 'assignments', 'submissions', 'uploaded_files'];
  for (const t of tables) {
    const res = await client.execute('PRAGMA table_info(' + t + ')');
    console.log(`- ${t}:`, res.rows.map((r: any) => r.name).join(', '));
  }
}

migrate()
  .then(() => {
    console.log('\nAll Turso Cloud tables verified successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
