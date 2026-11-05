import Link from 'next/link';
import { getAssignmentsAction, getSubmissionsAction } from '@/app/actions/assignment-actions';
import { getCurrentUser } from '@/lib/session';
import TugasClient from './tugas-client';
import { FileText, Laptop, ArrowLeft, CalendarCheck, BookOpen } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tugas Praktikum Komputer - computer.pletig SDN Pleburan 03',
  description: 'Pengumpulan tugas praktikum ekstrakurikuler komputer siswa SDN Pleburan 03 Semarang.',
};

export default async function TugasPage() {
  let currentUser = null;
  let allAssignments: any[] = [];
  let allSubmissions: any[] = [];

  try {
    const [user, assignments, submissions] = await Promise.all([
      getCurrentUser(),
      getAssignmentsAction(),
      getSubmissionsAction(),
    ]);
    currentUser = user;
    allAssignments = assignments;
    allSubmissions = submissions;
  } catch (err) {
    console.warn('Warning: Could not fetch assignments during render:', err);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between pb-24 sm:pb-0 overflow-x-hidden">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0"
            >
              <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
            </Link>
            <div>
              <Link href="/" className="text-base sm:text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                computer<span className="text-indigo-600">.pletig</span>
              </Link>
              <p className="text-[11px] text-slate-500 font-normal">
                Tugas Praktikum • SDN Pleburan 03
              </p>
            </div>
          </div>

          {/* Desktop Right Links */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/absen"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Presensi Siswa</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {/* Banner Section */}
        <div className="bg-slate-900 rounded-xl p-6 sm:p-8 text-white border border-slate-800 shadow-sm mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-xs font-medium text-slate-300 mb-3 border border-slate-700">
              <FileText className="w-4 h-4 text-indigo-400" aria-hidden="true" />
              Ruang Karya & Latihan Praktikum
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 flex items-center gap-2 text-white">
              <span>Tugas & Praktik Komputer</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Kumpulkan hasil latihan mengetik, gambar digital, atau project Scratch kamu di sini melalui folder pengumpulan Google Drive resmi.
            </p>
          </div>
        </div>

        {/* Client Interactive Filter & Submission Modal */}
        <TugasClient
          initialAssignments={allAssignments}
          initialSubmissions={allSubmissions}
          currentUser={currentUser}
        />
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200 max-w-6xl mx-auto w-full px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span>SDN Pleburan 03 Semarang</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>Portal computer.pletig • SDN Pleburan 03</span>
        </div>
      </footer>
    </div>
  );
}
