import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/logout-button';
import Link from 'next/link';
import { getAllMeetingsAction } from '@/app/actions/meeting-actions';
import { getAssignmentsAction, getSubmissionsAction } from '@/app/actions/assignment-actions';
import AdminDashboardClient from './admin-dashboard-client';
import {
  ShieldCheck,
  Laptop,
  ArrowLeft,
  CalendarCheck,
  BookOpen,
  FileText,
  Award,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  // Double check auth & role
  if (!user || user.role !== 'superadmin') {
    redirect('/login?tab=admin');
  }

  // Ambil data awal dari server
  const [meetings, assignments, submissions] = await Promise.all([
    getAllMeetingsAction().catch(() => []),
    getAssignmentsAction().catch(() => []),
    getSubmissionsAction().catch(() => []),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 w-full max-w-full overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4 w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/"
              className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0"
            >
              <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                  computer<span className="text-indigo-600">.pletig</span>
                </span>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                  Superadmin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal truncate hidden sm:block">
                Panel Pembina • SDN Pleburan 03 Semarang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">{user.name}</div>
              <div className="text-[11px] text-slate-500 font-normal truncate">@{user.username}</div>
            </div>
            <LogoutButton variant="danger" className="shrink-0" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {/* Welcome Banner */}
        <div className="bg-slate-900 rounded-xl p-6 sm:p-8 text-white border border-slate-800 shadow-sm mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-xs font-medium text-slate-300 mb-3 border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-indigo-400" aria-hidden="true" />
              Akses Kendali Pembina Ekstrakurikuler
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 flex items-center gap-2 text-white">
              <span>Selamat Datang, {user.name}</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Kelola sesi pertemuan, buka/tutup presensi, serta periksa dan beri nilai hasil tugas praktikum siswa SDN Pleburan 03.
            </p>
          </div>
        </div>

        {/* Client Interactive Control Panel (Meetings, Assignments, Submissions) */}
        <AdminDashboardClient
          initialMeetings={meetings}
          initialAssignments={assignments}
          initialSubmissions={submissions}
          userName={user.name}
        />

        {/* Back Link */}
        <div className="mt-8 pt-4 border-t border-slate-200">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" aria-hidden="true" />
            Lihat Portal Utama Beranda Siswa
          </Link>
        </div>
      </main>
    </div>
  );
}
