import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendance, meetings, users } from '@/db/schema';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';
import { generateStyledRekapExcel, type AttendanceRecordForExcel } from '@/lib/excel-rekap';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Unauthorized: Hanya Pembina yang berhak mengunduh rekap presensi.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');
    const grade = searchParams.get('grade');
    const cleanup = searchParams.get('cleanup') === 'true';

    // 1. Dapatkan info nama sesi & target meeting
    let sessionTitle = 'Semua Sesi Pertemuan';
    let targetM: typeof meetings.$inferSelect | null = null;
    if (meetingId && meetingId !== 'all') {
      const found = await db.query.meetings.findFirst({
        where: eq(meetings.id, meetingId),
      });
      if (found) {
        targetM = found;
        sessionTitle = `Pertemuan ${found.meeting_number}: ${found.title}`;
      }
    }

    // Tentukan filter tingkat kelas
    let targetGradeFilter: number | null = null;
    if (grade && grade !== 'all') {
      targetGradeFilter = parseInt(grade, 10);
    } else if (targetM && targetM.grade_level) {
      targetGradeFilter = targetM.grade_level;
    }

    const gradeLabel =
      targetGradeFilter
        ? `Kelas ${targetGradeFilter} SD`
        : 'Semua Kelas (4, 5, 6)';

    // 2. Ambil semua siswa terdaftar yang aktif
    const allStudents = await db.query.users.findMany({
      where: and(
        eq(users.role, 'siswa'),
        eq(users.is_active, true),
        targetGradeFilter ? eq(users.grade_level, targetGradeFilter) : undefined
      ),
      orderBy: [asc(users.grade_level), asc(users.class_name), asc(users.name)],
    });

    // 3. Ambil data presensi yang sudah tercatat
    const allAtt = await db.query.attendance.findMany({
      orderBy: [desc(attendance.checked_in_at)],
      with: {
        meeting: true,
        user: true,
      },
    });

    const filteredAtt = allAtt.filter((a) => {
      if (meetingId && meetingId !== 'all' && a.meeting_id !== meetingId) {
        return false;
      }
      if (targetGradeFilter && a.grade_level !== targetGradeFilter) {
        return false;
      }
      return true;
    });

    // 4. Map presensi berdasarkan ID user atau nama
    const attByUserId = new Map<string, typeof allAtt[0]>();
    const attByName = new Map<string, typeof allAtt[0]>();

    for (const a of filteredAtt) {
      if (a.user_id) attByUserId.set(a.user_id, a);
      attByName.set(a.student_name.toLowerCase().trim(), a);
    }

    const usedAttendanceIds = new Set<string>();
    const excelRecords: AttendanceRecordForExcel[] = [];
    let counter = 1;

    // Siswa terdaftar resmi (HADIR / TIDAK HADIR)
    for (const s of allStudents) {
      const matched = attByUserId.get(s.id) || attByName.get(s.name.toLowerCase().trim());
      if (matched) {
        usedAttendanceIds.add(matched.id);
        const checkInDate = new Date(matched.checked_in_at);
        const dateStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(checkInDate);

        const timeStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        }).format(checkInDate);

        excelRecords.push({
          no: counter++,
          studentName: s.name,
          gradeLevel: s.grade_level || 4,
          className: s.class_name || `Kelas ${s.grade_level}`,
          meetingTitle: matched.meeting?.title || targetM?.title || 'Ekstrakurikuler Komputer',
          meetingNumber: matched.meeting?.meeting_number || targetM?.meeting_number || 1,
          dateStr,
          timeStr,
          status: 'HADIR',
        });
      } else {
        excelRecords.push({
          no: counter++,
          studentName: s.name,
          gradeLevel: s.grade_level || 4,
          className: s.class_name || `Kelas ${s.grade_level}`,
          meetingTitle: targetM?.title || 'Ekstrakurikuler Komputer',
          meetingNumber: targetM?.meeting_number || 1,
          dateStr: targetM?.date || '-',
          timeStr: '-',
          status: 'TIDAK HADIR',
        });
      }
    }

    // Siswa yang absen tetapi mungkin tidak ada di daftar siswa resmi
    for (const a of filteredAtt) {
      if (!usedAttendanceIds.has(a.id)) {
        const checkInDate = new Date(a.checked_in_at);
        const dateStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(checkInDate);

        const timeStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        }).format(checkInDate);

        excelRecords.push({
          no: counter++,
          studentName: a.student_name,
          gradeLevel: a.grade_level,
          className: a.user?.class_name || `Kelas ${a.grade_level}`,
          meetingTitle: a.meeting?.title || `Pertemuan ${a.meeting?.meeting_number || 1}`,
          meetingNumber: a.meeting?.meeting_number || 1,
          dateStr,
          timeStr,
          status: 'HADIR',
        });
      }
    }

    const totalPresent = excelRecords.filter((r) => r.status === 'HADIR').length;
    const totalAbsent = excelRecords.filter((r) => r.status === 'TIDAK HADIR').length;

    // 5. Generate file Excel berdesain warna & profesional
    const excelBuffer = await generateStyledRekapExcel(excelRecords, {
      sessionTitle,
      gradeFilter: gradeLabel,
      totalRecords: excelRecords.length,
      totalRegistered: excelRecords.length,
      totalPresent,
      totalAbsent,
    });

    // 6. Jika opsi "cleanup" aktif: Hapus data yang sudah diekspor untuk menghemat database Turso
    if (cleanup && filteredAtt.length > 0) {
      const idsToDelete = filteredAtt.map((a) => a.id);
      await db.delete(attendance).where(inArray(attendance.id, idsToDelete));
      console.log(`🧹 Auto-cleanup: Dihapus ${idsToDelete.length} data presensi yang telah direkap.`);
    }

    // Nama file dinamis & rapi
    const timestamp = new Date().toISOString().slice(0, 10);
    const cleanFileName = `Rekap_Presensi_Komputer_${grade !== 'all' && grade ? `Kls${grade}_` : ''}${timestamp}.xlsx`;

    return new Response(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${cleanFileName}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating Excel rekap:', error);
    return NextResponse.json(
      { error: 'Gagal membuat file Excel rekap presensi.' },
      { status: 500 }
    );
  }
}
