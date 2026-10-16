import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/logout-button';
import Link from 'next/link';
import { getAllMeetingsAction } from '@/app/actions/meeting-actions';
import { getMaterialsAction } from '@/app/actions/material-actions';
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

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  // Double check auth & role
  if (!user || user.role !== 'superadmin') {
    redirect('/login?tab=admin');
  }

  // Ambil data awal dari server
  const [meetings, materials, assignments, submissions] = await Promise.all([
    getAllMeetingsAction(),
    getMaterialsAction(),
    getAssignmentsAction(),
    getSubmissionsAction(),
  ]);

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-purple-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md shadow-purple-600/20 flex items-center justify-center shrink-0"
            >
              <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-bold text-slate-900">
                  computer<span className="text-purple-600">.pletig</span>
                </span>
                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Superadmin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Panel Pembina • SDN Pleburan 03 Semarang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{user.name}</div>
              <div className="text-[10px] text-purple-600 font-medium">@{user.username} (Env Pembina)</div>
            </div>
            <LogoutButton variant="danger" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-purple-700/15 mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-300" />
              Akses Kendali Pembina Ekstrakurikuler
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
              <span>Selamat Datang, {user.name}</span>
            </h1>
            <p className="text-purple-100 text-sm leading-relaxed">
              Kelola sesi pertemuan, buka/tutup presensi, upload modul materi praktikum, serta periksa dan beri nilai hasil tugas siswa SDN Pleburan 03.
            </p>
          </div>
        </div>

        {/* Client Interactive Control Panel (Meetings, Materials, Assignments, Submissions) */}
        <AdminDashboardClient
          initialMeetings={meetings}
          initialMaterials={materials}
          initialAssignments={assignments}
          initialSubmissions={submissions}
          userName={user.name}
        />

        {/* Back Link */}
        <div className="mt-8 pt-4 border-t border-slate-200/60">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Lihat Portal Utama Beranda Siswa
          </Link>
        </div>
      </main>
    </div>
  );
}
