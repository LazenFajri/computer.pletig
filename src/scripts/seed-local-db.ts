import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import path from 'path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../db/schema';

async function seedLocalDbWithExcel() {
  console.log('🔄 Memasukkan 158 siswa ke local.db...');
  const localClient = createClient({ url: 'file:local.db' });
  const localDb = drizzle(localClient, { schema });

  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  const filePath = path.join(process.cwd(), 'KLS 4-6 PER OKT 2026.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) return;

  const rombelTracker: Record<string, number> = {};

  worksheet.eachRow(async (row, rowNumber) => {
    if (rowNumber <= 2) return;
    const name = String(row.getCell(2).value || '').trim();
    const rombel = String(row.getCell(3).value || '').trim().toUpperCase();

    if (!name) return;

    rombelTracker[rombel] = (rombelTracker[rombel] || 0) + 1;
    const seq = rombelTracker[rombel];
    const match = rombel.match(/([456])/);
    const gradeLevel = match ? parseInt(match[1], 10) : 4;
    const username = `${rombel.toLowerCase()}-${String(seq).padStart(2, '0')}`;
    const avatarUrl = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(name)}`;

    await localDb
      .insert(schema.users)
      .values({
        name,
        username,
        password_hash: defaultPasswordHash,
        role: 'siswa',
        grade_level: gradeLevel,
        class_name: rombel,
        avatar_url: avatarUrl,
        is_active: true,
      })
      .onConflictDoUpdate({
        target: schema.users.username,
        set: {
          name,
          grade_level: gradeLevel,
          class_name: rombel,
        },
      });
  });

  console.log('✅ local.db berhasil di-update dengan 158 siswa!');
}

seedLocalDbWithExcel().catch(console.error);
