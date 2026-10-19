import { NextResponse } from 'next/server';
import { db } from '@/db';
import { meetings, attendance, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/sync
 * BaaS Sync Pull: Mengembalikan snapshot data pertemuan, presensi, dan master siswa.
 * Klien offline Kotlin dapat memanggil ini saat terhubung ke Wi-Fi.
 */
export async function GET() {
  try {
    const allMeetings = await db.query.meetings.findMany({
      orderBy: [desc(meetings.meeting_number), desc(meetings.date)],
    });

    const allStudents = await db.query.users.findMany({
      where: and(eq(users.role, 'siswa'), eq(users.is_active, true)),
      columns: {
        id: true,
        name: true,
        username: true,
        grade_level: true,
        class_name: true,
        avatar_url: true,
      },
      orderBy: [users.grade_level, users.class_name, users.name],
    });

    const allAttendances = await db.query.attendance.findMany({
      orderBy: [desc(attendance.checked_in_at)],
      limit: 500, // batasi presensi terbaru untuk efisiensi sinkronisasi
    });

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      meetings: allMeetings,
      students: allStudents,
      attendances: allAttendances,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/sync:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data sinkronisasi server.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sync
 * BaaS Sync Push: Menerima data lokal (pertemuan, token baru, atau presensi siswa)
 * yang dicatat saat admin dalam mode offline, lalu menyimpannya ke database server.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { unsyncedMeetings = [], unsyncedAttendances = [] } = body;

    let meetingsProcessed = 0;
    let attendancesProcessed = 0;

    // 1. Proses Sinkronisasi Pertemuan / Token
    for (const m of unsyncedMeetings) {
      if (!m.id) continue;

      const existing = await db.query.meetings.findFirst({
        where: eq(meetings.id, m.id),
      });

      if (existing) {
        await db
          .update(meetings)
          .set({
            title: m.title ?? existing.title,
            meeting_number: m.meeting_number ?? existing.meeting_number,
            grade_level: m.grade_level !== undefined ? m.grade_level : existing.grade_level,
            description: m.description ?? existing.description,
            date: m.date ?? existing.date,
            start_time: m.start_time ?? existing.start_time,
            end_time: m.end_time ?? existing.end_time,
            is_open: m.is_open !== undefined ? m.is_open : existing.is_open,
            is_active: m.is_active !== undefined ? m.is_active : existing.is_active,
            session_token: m.session_token ?? existing.session_token,
            attendance_token: m.attendance_token ?? existing.attendance_token,
            updated_at: new Date(),
          })
          .where(eq(meetings.id, m.id));
        meetingsProcessed++;
      } else {
        await db.insert(meetings).values({
          id: m.id,
          title: m.title || `Pertemuan ${m.meeting_number || 1}`,
          meeting_number: m.meeting_number || 1,
          grade_level: m.grade_level ?? null,
          description: m.description || '',
          date: m.date || new Date().toISOString().split('T')[0],
          start_time: m.start_time || '12:30',
          end_time: m.end_time || '14:00',
          is_open: m.is_open ?? true,
          is_active: m.is_active ?? true,
          session_token: m.session_token || Math.floor(1000 + Math.random() * 9000).toString(),
          attendance_token: m.session_token || null,
        });
        meetingsProcessed++;
      }
    }

    // 2. Proses Sinkronisasi Presensi Siswa yang dibuat offline
    for (const a of unsyncedAttendances) {
      if (!a.meeting_id || !a.student_name) continue;

      const attendanceId = a.id || crypto.randomUUID();

      // Cek apakah siswa sudah terdata di pertemuan ini
      const existing = await db.query.attendance.findFirst({
        where: a.id
          ? eq(attendance.id, a.id)
          : and(
              eq(attendance.meeting_id, a.meeting_id),
              eq(attendance.student_name, a.student_name)
            ),
      });

      const checkInDate = a.check_in_time ? new Date(a.check_in_time) : new Date();

      if (existing) {
        await db
          .update(attendance)
          .set({
            status: a.status || existing.status,
            station_number: a.station_number ?? existing.station_number,
            notes: a.notes ?? existing.notes,
          })
          .where(eq(attendance.id, existing.id));
        attendancesProcessed++;
      } else {
        await db.insert(attendance).values({
          id: attendanceId,
          meeting_id: a.meeting_id,
          user_id: a.user_id || null,
          student_name: a.student_name,
          grade_level: a.grade_level || 4,
          station_number: a.station_number || null,
          status: a.status || 'hadir',
          notes: a.notes || null,
          check_in_time: checkInDate,
          checked_in_at: checkInDate,
        });
        attendancesProcessed++;
      }
    }

    // Kembalikan data segar setelah sinkronisasi
    const updatedMeetings = await db.query.meetings.findMany({
      orderBy: [desc(meetings.meeting_number), desc(meetings.date)],
    });

    const updatedAttendances = await db.query.attendance.findMany({
      orderBy: [desc(attendance.checked_in_at)],
      limit: 500,
    });

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi berhasil! ${meetingsProcessed} sesi & ${attendancesProcessed} presensi tersinkron.`,
      timestamp: Date.now(),
      meetings: updatedMeetings,
      attendances: updatedAttendances,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/sync:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses sinkronisasi data ke server.' },
      { status: 500 }
    );
  }
}
