import ExcelJS from 'exceljs';
import path from 'path';

async function analyzeRows() {
  const filePath = path.join(process.cwd(), 'KLS 4-6 PER OKT 2026.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) return;

  const rombelCounts: Record<string, number> = {};
  const students: Array<{ no: any; name: string; rombel: string; grade: number }> = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return; // header rows
    const no = row.getCell(1).value;
    const name = String(row.getCell(2).value || '').trim();
    const rombel = String(row.getCell(3).value || '').trim();

    if (name) {
      rombelCounts[rombel] = (rombelCounts[rombel] || 0) + 1;
      
      // Determine grade level (4, 5, or 6) from rombel (e.g. "4A" -> 4, "5B" -> 5, "6" -> 6)
      const match = rombel.match(/([456])/);
      const grade = match ? parseInt(match[1], 10) : 4;
      students.push({ no, name, rombel, grade });
    }
  });

  console.log('Total students:', students.length);
  console.log('Rombel breakdown:', rombelCounts);
  console.log('Sample first 5:', students.slice(0, 5));
  console.log('Sample last 5:', students.slice(-5));
}

analyzeRows().catch(console.error);
