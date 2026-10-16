'use client';

import { useState } from 'react';
import type { MaterialWithMeeting } from '@/app/actions/material-actions';
import type { GradeLevel } from '@/lib/auth-types';
import {
  BookOpen,
  FileText,
  Video,
  Link as LinkIcon,
  Search,
  ExternalLink,
  GraduationCap,
  Calendar,
  ArrowRight,
} from 'lucide-react';

interface MateriClientProps {
  initialMaterials: MaterialWithMeeting[];
}

export default function MateriClient({ initialMaterials }: MateriClientProps) {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalMaterial, setActiveModalMaterial] = useState<MaterialWithMeeting | null>(null);

  const filteredMaterials = initialMaterials.filter((mat) => {
    // Filter grade
    if (selectedGrade !== 'all') {
      if (mat.meeting && mat.meeting.gradeLevel !== null && mat.meeting.gradeLevel !== selectedGrade) {
        return false;
      }
    }
    // Filter search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = mat.title.toLowerCase().includes(q);
      const matchMeeting = mat.meeting?.title.toLowerCase().includes(q);
      const matchContent = mat.contentMarkdown?.toLowerCase().includes(q);
      return matchTitle || matchMeeting || matchContent;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Controls: Grade Filter & Search */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Grade tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            Kelas:
          </span>

          <button
            type="button"
            onClick={() => setSelectedGrade('all')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-heading font-bold transition-all cursor-pointer ${
              selectedGrade === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Kelas
          </button>

          <button
            type="button"
            onClick={() => setSelectedGrade(4)}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-heading font-bold transition-all cursor-pointer ${
              selectedGrade === 4
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Kelas 4 SD (Kamis)
          </button>

          <button
            type="button"
            onClick={() => setSelectedGrade(5)}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-heading font-bold transition-all cursor-pointer ${
              selectedGrade === 5
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Kelas 5 SD (Selasa)
          </button>

          <button
            type="button"
            onClick={() => setSelectedGrade(6)}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-heading font-bold transition-all cursor-pointer ${
              selectedGrade === 6
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Kelas 6 SD (Senin)
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari judul materi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-2xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Materials Cards Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-600 text-base">Materi belum ditemukan.</p>
          <p className="text-xs text-slate-400 mt-1">Coba ganti filter kelas atau kata kunci pencarian di atas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              className="bg-white rounded-3xl p-5 border-2 border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {mat.meeting ? `Pertemuan ${mat.meeting.meetingNumber}` : 'Modul Ekstra'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {mat.meeting?.date || '2026'}
                  </span>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center mb-3 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  {mat.fileType === 'pdf' ? (
                    <FileText className="w-6 h-6" />
                  ) : mat.fileType === 'video' ? (
                    <Video className="w-6 h-6" />
                  ) : (
                    <BookOpen className="w-6 h-6" />
                  )}
                </div>

                <h3 className="font-heading font-bold text-slate-900 text-lg mb-1.5 group-hover:text-blue-600 transition-colors">
                  {mat.title}
                </h3>

                {mat.contentMarkdown && (
                  <p className="text-xs text-slate-500 line-clamp-3 mb-4 leading-relaxed">
                    {mat.contentMarkdown}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalMaterial(mat)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Baca Ringkasan
                </button>

                {mat.fileUrl ? (
                  <a
                    href={mat.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-heading font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Buka Materi</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveModalMaterial(mat)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-heading font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Lihat Panduan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Baca Ringkasan Materi */}
      {activeModalMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    {activeModalMaterial.meeting?.title || 'Ekstrakurikuler Komputer'}
                  </span>
                  <h3 className="font-heading font-bold text-base text-slate-900">
                    {activeModalMaterial.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalMaterial(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="prose prose-sm text-slate-700 leading-relaxed space-y-3">
              {activeModalMaterial.contentMarkdown ? (
                <div className="whitespace-pre-line bg-slate-50 p-4 rounded-2xl text-xs sm:text-sm">
                  {activeModalMaterial.contentMarkdown}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Tidak ada deskripsi tambahan untuk materi ini.</p>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModalMaterial(null)}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
              {activeModalMaterial.fileUrl && (
                <a
                  href={activeModalMaterial.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-heading font-bold px-4 py-2 rounded-2xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
                >
                  <span>Buka Link Materi</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
