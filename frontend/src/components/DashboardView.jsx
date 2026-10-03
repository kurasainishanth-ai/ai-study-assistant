import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Layers,
  BrainCircuit,
  FileText,
  Upload,
  ArrowRight,
  Award,
  Bot,
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

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">

      {/* Welcome — compact */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-900/40 to-slate-900/80 p-6 border border-violet-500/20">
        <h2 className="text-xl font-bold text-white mb-1">
          Welcome to <span className="text-violet-400">StudyVerse</span>
        </h2>
        <p className="text-sm text-slate-400 mb-4 max-w-lg">
          Upload study materials and let AI transform them into notes, flashcards, and quizzes.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onUploadClick}
            className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Material
          </button>
          {materials.length > 0 && (
            <button
              onClick={() => onNavigateTab('library')}
              className="btn btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              Library ({materials.length})
            </button>
          )}
        </div>
      </div>

      {/* Quick actions — 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: 'notes', icon: FileText, label: 'Smart Notes', desc: 'Generate study notes', color: 'violet' },
          { id: 'flashcards', icon: Layers, label: 'Flashcards', desc: 'Spaced repetition cards', color: 'indigo' },
          { id: 'quiz', icon: BrainCircuit, label: 'Quiz Arena', desc: 'Test your knowledge', color: 'emerald' },
          { id: 'tutor', icon: Bot, label: 'AI Tutor', desc: 'Ask anything', color: 'cyan' },
        ].map(({ id, icon: Icon, label, desc, color }) => (
          <button
            key={id}
            onClick={() => onNavigateTab(id)}
            className="glass-card p-4 text-left cursor-pointer hover:border-violet-500/40 transition group"
          >
            <div className={`w-9 h-9 rounded-lg bg-${color}-600/20 text-${color}-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-0.5">{label}</h3>
            <p className="text-xs text-slate-500">{desc}</p>
          </button>
        ))}
      </div>

      {/* Materials + Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent materials */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-400" />
              Recent Materials
            </h3>
            {materials.length > 0 && (
              <button
                onClick={() => onNavigateTab('library')}
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {materials.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <FileBox className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No materials yet</p>
              <button onClick={onUploadClick} className="btn btn-secondary text-xs py-1.5 px-3 mt-3">
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {materials.slice(0, 4).map((m) => {
                const isActive = m.id === activeDocId;
                return (
                  <div
                    key={m.id}
                    onClick={() => setActiveDocId(m.id)}
                    className={`px-4 py-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isActive
                        ? 'bg-violet-950/20 border-violet-500/40'
                        : 'bg-slate-900/30 border-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{m.name}</div>
                        <div className="text-[11px] text-slate-500">{m.type} · {m.size_kb} KB</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveDocId(m.id); onNavigateTab('notes'); }}
                        className="text-[11px] text-slate-400 hover:text-violet-300 px-2 py-1 rounded hover:bg-slate-800 transition"
                      >
                        Notes
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveDocId(m.id); onNavigateTab('flashcards'); }}
                        className="text-[11px] text-slate-400 hover:text-violet-300 px-2 py-1 rounded hover:bg-slate-800 transition"
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

        {/* Snapshot */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-emerald-400" />
            Learning Snapshot
          </h3>

          <div className="space-y-3">
            {[
              { label: 'Documents', value: materials.length, color: 'text-white' },
              { label: 'Quiz Accuracy', value: `${progress?.average_quiz_score ?? 0}%`, color: 'text-emerald-400' },
              { label: 'Total Flashcards', value: progress?.total_flashcards ?? 0, color: 'text-violet-300' },
              { label: 'Total Quizzes', value: progress?.total_quizzes ?? 0, color: 'text-cyan-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{label}</span>
                <span className={`font-semibold font-mono ${color}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60">
            <button
              onClick={() => onNavigateTab('progress')}
              className="w-full text-xs text-slate-400 hover:text-violet-300 flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-slate-800/50 transition"
            >
              Detailed Analytics <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
