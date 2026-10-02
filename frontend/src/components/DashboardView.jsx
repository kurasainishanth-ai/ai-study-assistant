import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Layers,
  BrainCircuit,
  FileText,
  Upload,
  ArrowRight,
  Flame,
  Award,
  Bot,
  CheckCircle,
  FileBox
} from 'lucide-react';
import { api } from '../services/api';

export default function DashboardView({
  materials = [],
  activeDocId,
  setActiveDocId,
  onNavigateTab,
  onUploadClick
}) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    api.getProgressAnalytics().then(setProgress).catch(() => {});
  }, [materials]);

  const activeDoc = materials.find((m) => m.id === activeDocId);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900/60 via-indigo-900/40 to-slate-900 p-8 border border-violet-500/30 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-xs font-semibold text-violet-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multimodal AI Learning Workspace</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Welcome to <span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">StudyVerse</span>
          </h2>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Upload lecture PDFs, slide decks, Word documents, diagrams or notes. StudyVerse transforms them into 11 smart note formats, spaced-repetition flashcards, and diagnostic adaptive quizzes.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onUploadClick}
              className="btn btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-lg shadow-violet-500/30"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Course Material</span>
            </button>
            <button
              onClick={() => onNavigateTab('library')}
              className="btn btn-secondary text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>View Library ({materials.length})</span>
            </button>
          </div>
        </div>

        {/* Subtle Decorative Glow Element */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('notes')}
          className="glass-card p-5 cursor-pointer hover:border-violet-500/60 transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center group-hover:scale-110 transition">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-white group-hover:text-violet-300 transition">
            Smart Notes (11 Styles)
          </h3>
          <p className="text-[11px] text-slate-400">
            Synthesize cheat sheets, outlines, & deep dives.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('flashcards')}
          className="glass-card p-5 cursor-pointer hover:border-violet-500/60 transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
            Flashcard Studio
          </h3>
          <p className="text-[11px] text-slate-400">
            Active recall with Spaced Repetition SRS.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('quiz')}
          className="glass-card p-5 cursor-pointer hover:border-violet-500/60 transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
            Quiz Arena & Misconceptions
          </h3>
          <p className="text-[11px] text-slate-400">
            Targeted tests that isolate learning blind spots.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('tutor')}
          className="glass-card p-5 cursor-pointer hover:border-violet-500/60 transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
            <Bot className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
            Grounded AI Tutor
          </h3>
          <p className="text-[11px] text-slate-400">
            Ask questions with direct page & slide citations.
          </p>
        </div>
      </div>

      {/* Two Column Section: Recent Study Materials & Learning Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Materials */}
        <div className="lg:col-span-2 glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-400" />
              Recent Study Materials
            </h3>
            <button
              onClick={() => onNavigateTab('library')}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {materials.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-slate-500">
              <FileBox className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">No study materials in your library yet.</p>
              <button
                onClick={onUploadClick}
                className="btn btn-secondary text-xs py-1.5 px-3 mt-2"
              >
                Upload Document or Try Sample Notes
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {materials.slice(0, 4).map((m) => {
                const isActive = m.id === activeDocId;
                return (
                  <div
                    key={m.id}
                    onClick={() => setActiveDocId(m.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isActive
                        ? 'bg-violet-950/30 border-violet-500/60'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{m.name}</span>
                          {isActive && <span className="badge badge-purple text-[8px]">Active</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {m.type} · {m.size_kb} KB · Uploaded {m.upload_time}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDocId(m.id);
                          onNavigateTab('notes');
                        }}
                        className="btn btn-secondary text-[11px] py-1 px-2.5"
                      >
                        Notes
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDocId(m.id);
                          onNavigateTab('flashcards');
                        }}
                        className="btn btn-secondary text-[11px] py-1 px-2.5"
                      >
                        Cards
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Snapshot / Mini Progress Card */}
        <div className="glass-card p-6 space-y-5">
          <div className="border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Learning Snapshot
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">SQLite Synchronized</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Study Streak</span>
              <span className="font-bold text-amber-300 font-mono">
                {progress?.streak_days ?? 1} Days
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Cards Due for Review</span>
              <span className="font-bold text-violet-300 font-mono">
                {progress?.cards_review_needed ?? 0} Cards
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Average Quiz Accuracy</span>
              <span className="font-bold text-emerald-400 font-mono">
                {progress?.average_quiz_accuracy ?? 0}%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Documents in Library</span>
              <span className="font-bold text-white font-mono">{materials.length}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => onNavigateTab('progress')}
              className="btn btn-secondary text-xs w-full py-2 flex items-center justify-center gap-1.5"
            >
              <span>View Detailed Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
